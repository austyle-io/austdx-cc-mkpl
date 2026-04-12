---
name: kbac-cyphers
description: >
  Use when writing or modifying .cypher files, creating seed data for the
  knowledge graph, adding constraints or indexes, defining new node types
  in Cypher, or working with Cypher 25 syntax. Provides MERGE-based
  idempotent patterns, timestamp conventions, numbered file naming, and
  relationship direction guidance specific to the kbac graph model.
---

# Cypher Authoring for kbac

## Overview

kbac stores graph data as code — `.cypher` files in `cypher/` are the source of truth for all graph state. Every seed file must be idempotent (safe to re-run without duplicating data). This skill guides writing correct, convention-following Cypher for the kbac knowledge graph.

## When to Use

- Creating new seed data files in `cypher/`
- Adding nodes or relationships to existing seed files
- Writing constraints or indexes
- Modifying existing seed data
- Working with Cypher 25 syntax specifics

## Node Creation Pattern

Always use MERGE (never CREATE) keyed on the `id` property:

```cypher
MERGE (t:Tool {id: 'my-tool'})
SET t.name = 'My Tool',
    t.type = 'library',
    t.version = '2.0.0',
    t.description = 'What this tool does',
    t.created = coalesce(t.created, datetime()),
    t.updated = datetime();
```

Rules:
- **MERGE on `{id: ...}` only** — the uniqueness-constrained property
- **SET all other properties** after MERGE, not inside it
- **Timestamps:** `coalesce(n.created, datetime())` preserves original creation time on re-run; `n.updated = datetime()` always refreshes
- **Semicolons:** every statement must end with `;` — `run-cypher.ts` splits on them

## Relationship Creation Pattern

Always MATCH both endpoints first, then MERGE the relationship:

```cypher
MATCH (a:Tool {id: 'source-tool'})
MATCH (b:Domain {id: 'target-domain'})
MERGE (a)-[:BELONGS_TO]->(b);
```

For relationships with properties:

```cypher
MATCH (s:System {id: 'kbac'})
MATCH (t:Tool {id: 'neo4j'})
MERGE (s)-[r:USES]->(t)
SET r.role = 'graph-storage';
```

## Relationship Direction Conventions

| Source | Relationship | Target | Properties |
|--------|-------------|--------|------------|
| Tool | BELONGS_TO | Domain | — |
| Tool | IMPLEMENTS | Concept | — |
| Tool | DEPENDS_ON | Tool | `{type: 'runtime'\|'build'\|'peer'}` |
| Tool | COMPOSES_WITH | Tool | `{pattern: 'description'}` |
| Concept | BELONGS_TO | Domain | — |
| System | USES | Tool | `{role: 'description'}` |
| System | APPLIES | Concept | — |

## File Naming

Seed files follow numbered sequential naming in `cypher/`:

```text
00-smoke-test.cypher        — Cypher 25 + APOC validation
01-constraints.cypher       — Uniqueness constraints on node .id
02-indexes.cypher           — Range, composite, fulltext indexes
03-seed-domains.cypher      — Domain nodes
04-seed-tools.cypher        — Tool nodes + relationships
05-seed-concepts.cypher     — Concept nodes + relationships
06-seed-systems.cypher      — System nodes + relationships
07-seed-meta-frameworks.cypher — Meta-framework tools + domains
```

New seed files: use the next sequential number (e.g., `08-seed-your-data.cypher`).
Query templates: place in `cypher/queries/your-query.cypher`.

## Available Labels

| Label | Required Properties | Optional Properties |
|-------|-------------------|-------------------|
| Tool | id, name | version, type, description |
| Concept | id, name | description |
| Domain | id, name | category, description |
| System | id, name | version, purpose, description |

All optional properties may be `null` in Neo4j. TypeBox schemas use `Type.Optional(Nullable(...))` for these.

## Constraints and Indexes

Every node label has a uniqueness constraint on `.id` (defined in `cypher/01-constraints.cypher`):

```cypher
CREATE CONSTRAINT tool_id IF NOT EXISTS
FOR (t:Tool) REQUIRE t.id IS UNIQUE;
```

When adding a new node label, add the matching constraint in `01-constraints.cypher`.

Fulltext indexes (`02-indexes.cypher`) are **single-label only** — cross-label search requires UNION across separate indexes.

## Running Cypher

```bash
# Run a seed file
yarn cypher cypher/08-your-file.cypher

# Run all seeds (in order)
yarn db:seed

# Ad-hoc query via cypher-shell (sources .env first)
set -a; source .env; set +a
cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count;"

# Destroy + recreate + seed (requires typing "reset graph")
yarn db:reset
```

## Common Mistakes

1. **CREATE instead of MERGE** — creates duplicates on re-run
2. **MERGE with multiple properties** — `MERGE (t:Tool {id: 'x', name: 'X'})` only merges if ALL properties match. MERGE on `{id}` only.
3. **Forgetting timestamps** — always SET created + updated
4. **Missing semicolons** — the Cypher runner splits on `;`
5. **Wrong relationship direction** — check the conventions table above
6. **Hardcoding credentials** — read from `.env` (loaded by Node's `--env-file-if-exists` flag or sourced into shell with `set -a; source .env; set +a`)
