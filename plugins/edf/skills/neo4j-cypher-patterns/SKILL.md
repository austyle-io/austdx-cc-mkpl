---
name: neo4j-cypher-patterns
description: >
  Use when writing Cypher queries against the EDF knowledge graph — querying
  components, phases, validation results, drift reports, or any EDF-specific
  graph state. Provides the schema-first rule, parameterized-query mandate,
  EDF core node types, and idempotent MERGE patterns. For broader Cypher
  authoring guidance (seed files, schemas, constraints), use the `kbac`
  plugin's skills instead.
---

<!-- @layer:1 -->

# Neo4j Cypher Patterns

Cypher query patterns for the EDF (Engineering Decision Framework) knowledge graph. This skill covers query mechanics specific to EDF entities. For general Cypher authoring — seed files, TypeBox schemas, constraints, indexes — defer to the `kbac` plugin's `kbac-queries`, `kbac-schemas`, and `kbac-cyphers` skills.

## Three Non-Negotiable Rules

1. **Schema first.** Call `mcp__neo4j-cypher__get_neo4j_schema()` before writing any query. The schema drifts; cached assumptions cause silent failures.
2. **Search before create.** Call `mcp__neo4j-memory__search_memories()` before creating entities. Roughly half of naive creates are duplicates without this step.
3. **Parameterize everything.** Never concatenate user input into a query string. Use `$paramName` and pass values via the params object.

## EDF Core Node Types

| Node Type | Purpose | Key Properties |
| --- | --- | --- |
| `Plugin` | Claude Code plugin under EDF governance | `name`, `category`, `description` |
| `Component` | Plugin component (agent/command/skill/hook) | `name`, `type` |
| `Phase` | Workflow phase in an EDF process | `order`, `name`, `description` |
| `State` | State machine state | `name`, `initial`, `final` |
| `SecurityRule` | Security enforcement rule | `risk`, `pattern`, `response` |
| `DecisionRecord` | Architectural decision (ADR-style) | `decision`, `rationale`, `status` |
| `ValidationResult` | Output of an EDF validation pass | `target`, `status`, `timestamp` |
| `DriftReport` | Detected drift between code and graph | `category`, `severity`, `detected` |

## Key Relationships

| Relationship | From → To | Purpose |
| --- | --- | --- |
| `HAS_COMPONENT` | `Plugin` → `Component` | Plugin owns component |
| `HAS_PHASE` | `Plugin` → `Phase` | Plugin defines workflow phase |
| `TRANSITIONS_TO` | `State` → `State` | State machine edge |
| `CONTAINS_DECISION` | `Plugin` → `DecisionRecord` | Decision recorded for plugin |
| `SUPERSEDED_BY` | `DecisionRecord` → `DecisionRecord` | Decision history chain |
| `VALIDATES` | `ValidationResult` → `Plugin` | Validation result targets plugin |
| `REPORTS` | `DriftReport` → `Component` | Drift detected on component |

## Query Patterns

### Discovery

List all node types with counts (useful first probe after `get_neo4j_schema`):

```cypher
MATCH (n)
WITH labels(n) AS nodeLabels
UNWIND nodeLabels AS label
RETURN label AS nodeType, count(*) AS count
ORDER BY count DESC
```

Find components by type:

```cypher
MATCH (p:Plugin)-[:HAS_COMPONENT]->(c:Component)
WHERE c.type = $componentType
RETURN p.name AS plugin, c.name AS component, c.description
```

### Idempotent Writes (MERGE)

Always prefer `MERGE` over `CREATE` for entities with a stable identity key. `MERGE` matches if present, creates if absent.

Create or update a plugin record:

```cypher
MERGE (p:Plugin {name: $name})
SET p.category = $category,
    p.description = $description,
    p.updated = datetime()
RETURN p
```

Link a decision to a plugin:

```cypher
MATCH (p:Plugin {name: $pluginName})
MERGE (d:DecisionRecord {decisionId: $decisionId})
SET d.decision = $decision,
    d.rationale = $rationale,
    d.status = $status,
    d.timestamp = datetime()
MERGE (p)-[:CONTAINS_DECISION]->(d)
```

### Validation & Drift

Find recent failing validations:

```cypher
MATCH (v:ValidationResult)-[:VALIDATES]->(p:Plugin)
WHERE v.status = 'FAILED'
  AND v.timestamp > datetime() - duration('P7D')
RETURN p.name AS plugin, v.target, v.timestamp
ORDER BY v.timestamp DESC
```

Drift reports grouped by severity:

```cypher
MATCH (d:DriftReport)-[:REPORTS]->(c:Component)
RETURN d.severity, count(*) AS reports, collect(c.name)[..5] AS examples
ORDER BY d.severity
```

### Decision Archaeology

Trace decisions matching a keyword:

```cypher
MATCH (d:DecisionRecord)
WHERE d.decision CONTAINS $keyword
OPTIONAL MATCH (p:Plugin)-[:CONTAINS_DECISION]->(d)
RETURN d.decision, d.rationale, d.status, d.timestamp, p.name AS plugin
ORDER BY d.timestamp DESC
```

Find superseded decision chains:

```cypher
MATCH (old:DecisionRecord {status: 'SUPERSEDED'})-[:SUPERSEDED_BY]->(new:DecisionRecord)
RETURN old.decision AS originalDecision,
       new.decision AS replacementDecision,
       old.timestamp AS supersededAt
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
| --- | --- | --- |
| Unbounded variable-length path | Timeout / OOM | Bound the depth: `*1..3` |
| Query without schema check | Silent failure on label drift | Call `get_neo4j_schema()` first |
| `CREATE` without prior search | Duplicates accumulate | Use `MERGE` on a stable key |
| String concatenation | Injection + parser fragility | Use `$param` placeholders |
| Missing `RETURN` | Empty result, hard to debug | Always return something explicit |

Examples:

```cypher
// BAD: unbounded path
MATCH (a)-[:KNOWS*]->(b) RETURN a, b

// GOOD: bounded path
MATCH (a)-[:KNOWS*1..3]->(b) RETURN a, b

// BAD: string concatenation
MATCH (n) WHERE n.name = '" + userInput + "' RETURN n

// GOOD: parameterized
MATCH (n) WHERE n.name = $userName RETURN n

// BAD: CREATE risks duplicates
CREATE (p:Plugin {name: $name})

// GOOD: MERGE is idempotent
MERGE (p:Plugin {name: $name})
```

## Performance Notes

- Start `MATCH` with the most selective indexed property.
- Filter early with `WHERE` placed close to the matching pattern.
- Use `LIMIT` aggressively in exploratory queries.
- Project only needed properties — avoid returning full nodes when a few fields suffice.
- Use `EXPLAIN` and `PROFILE` to inspect query plans before shipping a hot-path query.

Recommended indexes for the EDF graph (create once; ignored if present):

```cypher
CREATE INDEX plugin_name IF NOT EXISTS FOR (p:Plugin) ON (p.name);
CREATE INDEX decision_status IF NOT EXISTS FOR (d:DecisionRecord) ON (d.status);
CREATE INDEX validation_timestamp IF NOT EXISTS FOR (v:ValidationResult) ON (v.timestamp);
```

## MCP Invocation

Read query:

```typescript
const result = await mcp__neo4j_cypher__read_neo4j_cypher({
  query: `MATCH (p:Plugin {name: $name}) RETURN p`,
  params: { name: 'edf' },
});
```

Write query:

```typescript
await mcp__neo4j_cypher__write_neo4j_cypher({
  query: `MERGE (p:Plugin {name: $name}) SET p.updated = datetime()`,
  params: { name: 'edf' },
});
```

Memory search before create:

```typescript
const memories = await mcp__neo4j_memory__search_memories({
  query: 'edf validation result for plugin X',
});
```

## Clause Order Reminder

```
MATCH       pattern to find
WHERE       filter conditions
WITH        intermediate projection / aggregation
RETURN      final output
ORDER BY    sort
SKIP        pagination offset
LIMIT       result count cap
```

## When To Use `kbac` Instead

This skill is scoped to **querying** the EDF graph and writing **idempotent updates** for EDF-owned node types. If the task is:

- Designing new node labels or relationship types → use `kbac:kbac-schemas`
- Writing `.cypher` seed files or constraints → use `kbac:kbac-cyphers`
- Building reusable parameterized query templates for the broader kbac graph → use `kbac:kbac-queries`

Use those skills first, then come back here for the EDF-specific call patterns.
