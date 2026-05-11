---
name: kbac-queries
description: >
  Use when designing parameterized Cypher query templates for the kbac
  knowledge graph, writing lookup or traversal queries, working with
  fulltext search, or adding to the cypher/queries/ directory. Guides
  parameter naming, result structuring, and the five established query
  patterns (lookup, DFS, BFS, progressive-disclosure, cross-domain).
---

# Graph Query Design for kbac

## Overview

kbac has five established query patterns in `cypher/queries/`. New queries should follow these conventions. All queries use parameterized inputs (`$paramName`) and return structured results.

## When to Use

- Writing a new parameterized query template
- Choosing between traversal strategies (DFS vs BFS)
- Working with fulltext search
- Designing cross-domain queries
- Adding templates to `cypher/queries/`

## The Five Query Patterns

### 1. Lookup — O(1) by ID

Direct node fetch backed by uniqueness constraints. See `cypher/queries/lookup.cypher`.

```cypher
-- Simple lookup
MATCH (n:Tool {id: $id})
RETURN n { .* } AS tool;

-- Lookup with neighborhood
MATCH (n:Tool {id: $id})
OPTIONAL MATCH (n)-[r]-(neighbor)
RETURN n { .* } AS tool,
       collect({
         type: type(r),
         direction: CASE WHEN startNode(r) = n THEN 'outgoing' ELSE 'incoming' END,
         node: neighbor { .* }
       }) AS connections;
```

### 2. DFS Traversal — Dependency Chains

Follow variable-length paths depth-first. See `cypher/queries/dfs-traversal.cypher`.

```cypher
-- Forward dependency chain
MATCH path = (start:Tool {id: $id})-[:DEPENDS_ON*1..5]->(dep)
RETURN [n IN nodes(path) | n { .* }] AS chain,
       length(path) AS depth
ORDER BY depth;

-- Reverse impact analysis (what depends on this?)
MATCH path = (dependent)-[:DEPENDS_ON*1..5]->(target:Tool {id: $id})
RETURN [n IN nodes(path) | n { .* }] AS chain,
       length(path) AS depth
ORDER BY depth;
```

### 3. BFS Traversal — Shortest Paths

Find shortest connections and nearest neighbors. See `cypher/queries/bfs-traversal.cypher`.

```cypher
-- Shortest path between two nodes
MATCH path = shortestPath(
  (a:Tool {id: $startId})-[*..10]-(b:Tool {id: $endId})
)
RETURN [n IN nodes(path) | n { .* }] AS nodes,
       [r IN relationships(path) | type(r)] AS relationships;

-- Level-by-level expansion
MATCH (start:Tool {id: $id})-[r*1..3]-(neighbor)
WITH neighbor, min(size(r)) AS distance
RETURN neighbor { .* } AS node, distance
ORDER BY distance;
```

### 4. Progressive Disclosure — Multi-Level Drill-Down

Layered detail from overview to full context. See `cypher/queries/progressive-disclosure.cypher`.

- **Level 0:** Domain overview with item counts
- **Level 1:** Domain contents (tools + concepts in a domain)
- **Level 2:** Tool detail with all direct relationships
- **Level 3:** Full context — system uses, concepts, dependencies, compositions

Each level is a separate query variant, parameterized by `$domainId` or `$toolId`.

### 5. Cross-Domain Search — Fulltext + Boundary Traversal

Fulltext search and cross-domain path finding. See `cypher/queries/cross-domain.cypher`.

```cypher
-- Single-index fulltext search
CALL db.index.fulltext.queryNodes('tool_search', $searchTerm)
YIELD node, score
RETURN node { .*, _score: score } AS result
ORDER BY score DESC LIMIT 10;

-- Cross-label search (UNION required — fulltext indexes are single-label)
CALL db.index.fulltext.queryNodes('tool_search', $term) YIELD node, score
RETURN node { .* } AS result, score, labels(node)[0] AS label
UNION
CALL db.index.fulltext.queryNodes('concept_search', $term) YIELD node, score
RETURN node { .* } AS result, score, labels(node)[0] AS label
ORDER BY score DESC;
```

## Conventions

- **File location:** `cypher/queries/your-query.cypher`
- **Parameters:** `$paramName` in camelCase
- **Result projection:** use `node { .* }` to return all properties as a map
- **Comments:** `--` prefix, explain each variant
- **Multiple variants per file:** separated by comments, each ending with `;`
- **Depth limits:** always set upper bounds on variable-length paths (`*1..5`, not `*`)

## Using Queries in the Service Layer

```typescript
import { executeRead } from "../db/neo4j-service.js";
import { ToolSchema } from "../schemas/index.js";

const results = await executeRead(
  "MATCH (t:Tool {id: $id}) RETURN t { .* } AS tool",
  { id: "neo4j" },
  ToolSchema  // optional — enables runtime validation
);
```

The service layer handles:
- Automatic session creation and cleanup
- Neo4j type conversion (DateTime → ISO string, Node → properties)
- Retry on transient failures
- Optional TypeBox/AJV result validation

## Running Queries

```bash
# Execute a query template file
yarn cypher cypher/queries/lookup.cypher

# Ad-hoc query via cypher-shell
npx varlock run -- sh -c 'cypher-shell -a bolt://localhost:7688 -u neo4j -p "$NEO4J_PASSWORD" "MATCH (t:Tool) RETURN t.name LIMIT 5;"'
```
