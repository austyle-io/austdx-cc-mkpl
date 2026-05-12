# EDF + KBaC — Structured Orchestration Backed by a Knowledge Graph

> **Status:** Reference / integration overview
> **Audience:** Plugin users, agent authors, and anyone planning a Claude
> Code workflow that needs both deterministic structure *and* queryable
> domain knowledge.
> **Companion repos:**
> [`austyle-io/edf`](https://github.com/austyle-io/edf) ·
> [`austyle-io/kbac`](https://github.com/austyle-io/kbac) ·
> this marketplace (`austyle-io/austdx-cc-mkpl`)

This document stitches together the three repositories that power the
opinionated agentic workflow shipped by this marketplace:

| Repo | Role | What it ships |
|---|---|---|
| [`austyle-io/edf`](https://github.com/austyle-io/edf) | **Structure** — the language for orchestration artifacts | Parser, validator, templates, Neo4j sync for the Enhanced Document Format |
| [`austyle-io/kbac`](https://github.com/austyle-io/kbac) | **Memory** — the queryable knowledge graph | Neo4j 2026.x graph, TypeBox/AJV schemas, Cypher‑as‑Code seed files, CLI |
| [`austyle-io/austdx-cc-mkpl`](https://github.com/austyle-io/austdx-cc-mkpl) | **Surface** — the Claude Code plugins | `edf` and `kbac` plugins (agents, skills, hook, slash command) |

The thesis is simple: **EDF gives Claude a vocabulary for thinking
through a procedure; KBaC gives Claude something durable to think
*about*.** Together they let a decision tree — running inside a
runbook, inside an agent loop — *consult a knowledge base* before
choosing the next phase.

---

## Table of contents

1. [What EDF does](#1-what-edf-does)
   - [The four orchestration structures](#11-the-four-orchestration-structures)
   - [Runbooks](#12-runbooks)
   - [Decision trees](#13-decision-trees)
   - [Workflows](#14-workflows)
   - [Checklists](#15-checklists)
   - [Picking the right structure](#16-picking-the-right-structure)
2. [What KBaC does](#2-what-kbac-does)
   - [Knowledge base as code](#21-knowledge-base-as-code)
   - [The three meta-frameworks](#22-the-three-meta-frameworks)
   - [Domain model](#23-domain-model)
3. [The integration: decision trees that query the graph](#3-the-integration-decision-trees-that-query-the-graph)
   - [The closed loop](#31-the-closed-loop)
   - [Worked example](#32-worked-example)
4. [Using the plugins from this marketplace](#4-using-the-plugins-from-this-marketplace)
   - [Install both plugins](#41-install-both-plugins)
   - [EDF plugin surface](#42-edf-plugin-surface)
   - [KBaC plugin surface](#43-kbac-plugin-surface)
   - [Using EDF and KBaC together](#44-using-edf-and-kbac-together)
5. [Reference](#5-reference)

---

## 1. What EDF does

**EDF (Enhanced Document Format)** is a TypeScript library that turns
markdown documents with YAML frontmatter and a small XML vocabulary into
*executable* orchestration artifacts. From the upstream
[`README.md`](https://github.com/austyle-io/edf):

> Standalone TypeScript library for the EDF parser, validator,
> templates, and Neo4j sync.

EDF's job is to take human-authored procedures and make them
machine-checkable: schemas, references, layer budgets, and an explicit
4-layer progressive-disclosure model all live in the document itself.
The library ships:

- a **parser** (`src/parser/`) for frontmatter, layers, semantic XML tags, and decision-tree blocks (YAML/JSON/Mermaid),
- a **validator** (`src/validator/`) that enforces schemas, references, and circular-dependency rules and emits codes `EDF001`–`EDF005`,
- **templates** (`src/templates/`) for the EDF component types — agents, skills, commands, checklists, decision trees, workflows, runbooks,
- a **Neo4j sync** module (`src/neo4j/`) that generates idempotent Cypher MERGE statements and detects drift between documents and the graph.

The thing worth internalizing: every EDF document is *also* a graph
node. Drift between "what the doc says" and "what the graph believes"
is a first-class concern of the library.

### 1.1 The four orchestration structures

EDF exposes four orchestration structures. From the marketplace's
`edf:orchestration-patterns` skill
([`plugins/edf/skills/orchestration-patterns/SKILL.md`](../plugins/edf/skills/orchestration-patterns/SKILL.md)):

| Structure | Purpose | Shape |
|---|---|---|
| **Runbook** | EXECUTION | Linear, ordered phases with explicit cleanup |
| **Decision Tree** | ROUTING | Branching gates that resolve to terminal outcomes |
| **Checklist** | VERIFICATION | Unordered set of pass/fail criteria |
| **Workflow** | DECLARATIVE EXECUTION | DAG of nodes with edges, gates, and parallel branches |

Each has a *single* purpose. Picking the right one is the first design
decision; composing them correctly is the second. The skill puts it
bluntly: "if the answer feels like 'kind of both', you probably need a
composition, not a hybrid single document."

### 1.2 Runbooks

A runbook is a linear, ordered execution document with **guaranteed
cleanup**. It is the right home for migrations, deployments, incident
response, and any procedure where "what was the state when it failed"
matters.

EDF's runbook orchestration system (documented in
[`docs/systems/runbook-orchestration/SYSTEM.md`](https://github.com/austyle-io/edf/blob/main/docs/systems/runbook-orchestration/SYSTEM.md))
recognizes a small set of HTML-comment directives inside markdown:

- `<!-- timeout: Ns -->` — per-phase timeout
- `<!-- parallel-start --> ... <!-- parallel-end -->` — parallel block
- `<!-- retry: N -->` — retry on failure
- `<!-- cleanup-phase -->` — phase tagged as the cleanup target
- `<!-- run: always -->` — execute regardless of upstream failure
- `<!-- cleanup-background-tasks -->` — terminate tracked background work

The execution flow is fixed:

1. **Discovery** — locate runbook.
2. **Pre-flight assessment** — strategist evaluates readiness (optional).
3. **Mission briefing** — executor parses structure, builds plan.
4. **Phase execution** — sequential + parallel blocks honour dependencies.
5. **Failure handling** — remediation / retry / skip-dependents.
6. **Cleanup** — terminate background tasks + run idempotent cleanup.

The marketplace's EDF plugin maps directly onto this:
`runbook-strategist` does step 2, `runbook-executor` does steps 3–6.
The companion skills (`runbook-preflight`, `runbook-run`,
`runbook-authoring`, `runbook-scaffold`) cover the surrounding lifecycle.

### 1.3 Decision trees

A decision tree is **pure routing**. Gates evaluate; terminals act.
From EDF's decision-trees subsystem
([`docs/systems/decision-trees/SYSTEM.md`](https://github.com/austyle-io/edf/blob/main/docs/systems/decision-trees/SYSTEM.md)):

> Trees follow this pattern: entry point → gates (with yes/no
> branching) → terminals.

Two node types:

| Node | Role |
|---|---|
| `DecisionGate` | Binary (or n-ary) branching point with a question, detection signals, and references to the next nodes |
| `DecisionTerminal` | Leaf mapping to one of four outcomes — `success`, `failure`, `skip`, `escalate` — with guidance |

The parser accepts YAML, JSON, or Mermaid representations and validates
seven structural rules (cycle detection via DFS, reachability via BFS,
ID uniqueness, missing entry points, etc.). It can emit:

- a **Mermaid flowchart** for review, and
- a **Cypher script** that persists the tree as nodes-and-edges in Neo4j.

That last point is what makes the loop in [§3](#3-the-integration-decision-trees-that-query-the-graph)
possible: trees themselves live in the knowledge graph.

Three hard rules from the `orchestration-patterns` skill:

- Trees **terminate**; they don't loop. If iteration is needed, the
  terminal points at a runbook that loops.
- Depth ≤ 3. Deeper trees are almost always a checklist plus a router
  in disguise.
- Gates **never mutate state**. A side-effectful gate breaks
  replayability and audit.

### 1.4 Workflows

A workflow is a **declarative DAG** — nodes with edges, gates between
edges, and optional parallel branches. It is the generalization of a
runbook to a non-linear shape, and the right pick when you have
fan-out/fan-in or multi-criteria gates.

From the upstream
[`docs/guides/EDF-WORKFLOW-ORCHESTRATION.md`](https://github.com/austyle-io/edf/blob/main/docs/guides/EDF-WORKFLOW-ORCHESTRATION.md),
workflows have five step types — `action-step`, `decision-step`,
`parallel-step`, `validation-step`, `delegation-step`, `composite-step`
— and four parallel-execution strategies: `all`, `race`, `allSettled`,
`batch`. Validation gates are pluggable (`quality`, `security`,
`compliance`, `performance`, `approval`) and can `block`, `warn`,
`retry`, or `escalate` on failure.

A workflow is what you reach for when a runbook keeps wanting to say
*"do A and B in parallel then merge"*.

### 1.5 Checklists

A checklist is **flat verification**. Independent pass/fail criteria,
order-irrelevant, no routing. The outcome is "all pass" or "here's
the failure list".

Checklists are the right tool for release readiness, security review
gates, and pre-flight checks. They are *not* the right tool for
"if X then check Y else check Z" — that is a decision tree wearing a
checklist costume (`orchestration-patterns` skill, "Anti-Patterns").

### 1.6 Picking the right structure

The selection tree from
[`orchestration-patterns`](../plugins/edf/skills/orchestration-patterns/SKILL.md):

```text
Is the output a routing choice?
├─ YES → Decision Tree
└─ NO  → Is the work a set of independent checks?
         ├─ YES → Checklist
         └─ NO  → Does the work fan out and back in?
                  ├─ YES → Workflow
                  └─ NO  → Runbook
```

And five composition patterns the skill catalogues:

1. **Runbook embeds Decision Tree** — single branching point inside a linear procedure.
2. **Workflow gates on Checklist** — DAG edge requires all checklist items to pass.
3. **Runbook ends with Checklist** — "are we done?" as multi-criteria verification.
4. **Decision Tree terminals point at Runbooks** — pure routing between distinct procedures.
5. **Workflow node delegates to Runbook** — one DAG node is itself a multi-phase procedure with cleanup.

These compositions are the seam where KBaC plugs in.

---

## 2. What KBaC does

### 2.1 Knowledge base as code

[`kbac`](https://github.com/austyle-io/kbac) — Knowledge Base as Code —
is, per its own description, "a Neo4j 2026.x graph database that
documents meta-frameworks and development systems, used as a shared
knowledge base for AI coding agents."

The architecture (from
[`docs/ARCHITECTURE.md`](https://github.com/austyle-io/kbac/blob/main/docs/ARCHITECTURE.md))
boils down to:

- Neo4j 2026.02.3-community in Docker, with APOC Core + Extended.
- `cypher-shell` for ad-hoc queries; `neo4j-driver 6.x` for typed access from TypeScript.
- TypeBox 1.x + AJV 8.x as the **single source of truth** for the graph's type system.
- Cypher 25 files in `cypher/` that *are* the schema, indexes, and seed data — numbered, idempotent, alphabetically applied.
- Bolt on `7688`, HTTP browser on `7475` (port offsets chosen to avoid colliding with `neo4j-memory` on the standard `7687`/`7474`).
- Credentials in a gitignored `.env`, loaded by Node 22+'s `--env-file-if-exists`.

The data strategy:

> Persistent volumes preserve data across container lifecycle; `.cypher`
> files in git enable full reconstruction via `yarn db:reset`.

This is the "as code" part. Drop the volume, replay the cypher files,
get the same graph. No manual entry, no migration drift.

### 2.2 The three meta-frameworks

From
[`docs/META-FRAMEWORKS.md`](https://github.com/austyle-io/kbac/blob/main/docs/META-FRAMEWORKS.md),
kbac composes three reusable patterns:

| Meta-framework | What it gives you |
|---|---|
| **TypeBox + AJV Validation Stack** | One schema → JSON Schema (AJV runtime), TypeScript type (`Static<>`), and type guard (`validate()`). Zero drift between compile-time and runtime. |
| **Neo4j + Docker Graph Infrastructure** | Exact-pinned Neo4j image, persistent named volumes, JVM tuning, query logging, and a Bolt healthcheck. Rebuildable from cypher files. |
| **Cypher as Code** | Numbered `.cypher` files under version control. Idempotent (`MERGE` + `IF NOT EXISTS`). Re-applicable at any time. |

The trick is the composition: the validation stack validates data
flowing into the graph infrastructure, with schema and data defined in
cypher files. Each piece is independently useful in any TypeScript or
Neo4j project; together they are "kbac".

### 2.3 Domain model

The graph has four node labels and a small set of relationship types
(also from the architecture doc):

| Node | What it represents |
|---|---|
| `Tool` | A library, framework, or CLI (e.g. Neo4j, TypeBox, Docker) |
| `Concept` | A technique or pattern (e.g. Schema Validation, Data as Code) |
| `Domain` | A high-level area (e.g. Graph Databases, TypeScript) |
| `System` | A composed meta-framework (e.g. kbac itself, EDF itself) |

| Relationship | Reading |
|---|---|
| `IMPLEMENTS` | Tool implements Concept |
| `DEPENDS_ON` | A → B; A needs B |
| `BELONGS_TO` | Node belongs to Domain |
| `USES` | System / Tool uses Tool |
| `APPLIES` | Concept applies in a context |
| `COMPOSES_WITH` | System composes with System |

A navigational index strategy gives:

- O(1) lookup via unique constraint on `id`,
- DFS / BFS over `DEPENDS_ON` chains with bounded path length,
- progressive disclosure (Domain → Concept → Tool drill-down),
- cross-domain fulltext search on `name + description`.

This is the surface that EDF decision trees query.

---

## 3. The integration: decision trees that query the graph

The whole point of putting EDF and KBaC side-by-side is to make the
following loop possible:

```text
┌────────────────────── agent / runbook loop ─────────────────────────┐
│                                                                     │
│   1. Reach a decision point inside a runbook or workflow            │
│           │                                                         │
│           ▼                                                         │
│   2. Evaluate a Decision Tree gate                                  │
│           │                                                         │
│           │   gate question: "which tool fits this domain?"         │
│           ▼                                                         │
│   3. Query KBaC knowledge graph via Cypher                          │
│      (MATCH (t:Tool)-[:IMPLEMENTS]->(c:Concept) ...)                │
│           │                                                         │
│           ▼                                                         │
│   4. Use the result to pick a terminal                              │
│      → terminal references the next Runbook / Phase                 │
│           │                                                         │
│           ▼                                                         │
│   5. Execute that runbook                                           │
│      └─── side effects, validation results, drift reports ─────┐    │
│                                                                ▼    │
│   6. Persist outcomes back into the graph                           │
│      (MERGE (v:ValidationResult)-[:VALIDATES]->(p:Plugin) ...)      │
│           │                                                         │
│           └──── feeds the next iteration's gate signals ────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

The gate **reads**, the terminal **routes**, the runbook **executes**,
and the executor **writes back**. The next pass through the gate is
informed by the prior pass's writes. This is the closed loop.

### 3.1 The closed loop

Three pieces make it work:

**a. Trees themselves live in Neo4j.**
EDF's decision-tree parser can emit Cypher for any tree it parses.
That means a tree is queryable: an agent can ask "which trees evaluate
gate signals matching `migration-strategy`?" and pick one.

**b. EDF reserves a vocabulary of node types for orchestration state.**
From the marketplace's
[`edf:neo4j-cypher-patterns`](../plugins/edf/skills/neo4j-cypher-patterns/SKILL.md)
skill, the EDF-owned node types are:

| Node | Purpose |
|---|---|
| `Plugin` | Plugin under EDF governance |
| `Component` | Plugin component (agent / command / skill / hook) |
| `Phase` | Workflow phase |
| `State` | State-machine state |
| `SecurityRule` | Security enforcement rule |
| `DecisionRecord` | ADR-style architectural decision |
| `ValidationResult` | Output of an EDF validation pass |
| `DriftReport` | Detected drift between code and graph |

KBaC contributes `Tool`, `Concept`, `Domain`, `System`. These two
vocabularies are *complementary*, not overlapping. A `Phase` can
`USES` a `Tool`; a `DecisionRecord` can `APPLIES` a `Concept`; a
`Component` can `IMPLEMENTS` a `Concept`.

**c. Three non-negotiable rules at the query boundary.**
Also from `edf:neo4j-cypher-patterns`:

1. **Schema first.** Call `mcp__neo4j-cypher__get_neo4j_schema()` before writing any query. The schema drifts; cached assumptions cause silent failures.
2. **Search before create.** Call `mcp__neo4j-memory__search_memories()` before creating entities. Roughly half of naive creates are duplicates without this step.
3. **Parameterize everything.** Never concatenate user input into a query string.

The `edf:neo4j-cypher-patterns` skill defers to the kbac plugin's
skills for the *authoring* side — `kbac:kbac-schemas` for designing
new labels, `kbac:kbac-cyphers` for seed files and constraints,
`kbac:kbac-queries` for reusable parameterized templates. EDF supplies
the *query* patterns for its own node types; KBaC supplies the
patterns for everything else.

### 3.2 Worked example

A migration runbook reaches the routing phase:

```markdown
## Phase 3: Select Migration Strategy

Evaluate decision tree `migration-strategy.tree.yaml`.

- Terminal `in-place`   → continue to Phase 4a
- Terminal `blue-green` → continue to Phase 4b
- Terminal `abort`      → jump to cleanup phase
```

Inside the tree, one gate asks "does our stack support
zero-downtime cutover?". The gate's resolution is not hard-coded —
it queries KBaC:

```cypher
MATCH (s:System {name: $systemName})
      -[:USES]->(t:Tool)
      -[:IMPLEMENTS]->(c:Concept {name: 'Zero Downtime Deployment'})
RETURN t.name AS supportingTool, count(*) AS support
```

`support > 0` → take the `yes` branch (terminal `blue-green`,
which references `blue-green-deploy.runbook.md`).
`support = 0` → take the `no` branch (terminal `in-place`, which
references `in-place-migration.runbook.md`).

After the runbook executes, it MERGEs back:

```cypher
MERGE (v:ValidationResult {target: $runbookId, runId: $runId})
SET   v.status = $status,
      v.timestamp = datetime()
WITH v
MATCH (p:Plugin {name: $pluginName})
MERGE (v)-[:VALIDATES]->(p)
```

Next time the same tree fires, a different gate ("has this migration
strategy failed recently?") can read those `ValidationResult`s and
route around a known-bad path. The loop closes.

---

## 4. Using the plugins from this marketplace

The `edf` and `kbac` plugins in this marketplace package the surface
described above for Claude Code. You do **not** need to install the
companion libraries to use the plugins — but the plugins are at their
most useful when the libraries are checked out locally and reachable
(the EDF validator runs from the `edf` library; the kbac CLI talks to
a live Neo4j container managed from the `kbac` repo).

### 4.1 Install both plugins

From the marketplace [`README.md`](../README.md):

```bash
claude plugin marketplace add austyle-io/austdx-cc-mkpl
claude plugin install edf@austdx-cc-mkpl
claude plugin install kbac@austdx-cc-mkpl
```

…or, from inside a Claude Code session:

```text
/plugin marketplace add austyle-io/austdx-cc-mkpl
/plugin install edf@austdx-cc-mkpl
/plugin install kbac@austdx-cc-mkpl
/reload-plugins
```

Per `AGENTS.md`, the kbac plugin pins `yarn@3.7.0` and declares its
hook dependencies in `plugins/kbac/hooks/package.json`. After
installing the plugin (and once, after cloning the marketplace) run:

```bash
yarn install
# inside plugins/kbac/hooks/
```

to materialize `typebox`, `ajv`, and `tsx` for the SessionStart hook.

### 4.2 EDF plugin surface

`plugins/edf` ships five agents and 19 skills (the plugin's
[`README.md`](../plugins/edf/README.md) is the authoritative list).
Grouped by job:

**Agents (5)**

| Agent | Role |
|---|---|
| `edf-author` | Author or refactor EDF documents from intent prompts |
| `edf-doc-reviewer` | Narrative review of an existing EDF document |
| `edf-layer-advisor` | Assign content to the right 4-layer disclosure level |
| `runbook-strategist` | Pre-flight assessment of a runbook before execution |
| `runbook-executor` | Execute a runbook phase-by-phase with guaranteed cleanup |

**Skills — Authoring**
`edf-authoring`, `runbook-authoring`, `runbook-scaffold`,
`scaffold-edf-component`, `arch-doc-scaffold`.

**Skills — Validation & audit**
`edf-validate`, `edf-validation-rules`, `edf-component-discovery`,
`edf-stats`, `plugin-edf-audit`.

**Skills — Workflow patterns**
`orchestration-patterns`, `migration-patterns`,
`iterative-refinement`, `skeptical-review-pattern`.

**Skills — Decision & escalation**
`decision-protocol`, `escalation-decision-tree`,
`runbook-preflight`, `runbook-run`.

**Skills — Graph**
`neo4j-cypher-patterns` — EDF-specific Cypher patterns. Defers to
the kbac plugin for general authoring.

Typical entry points:

- *"I have a procedure — what should it be?"* → `orchestration-patterns`.
- *"Write me one."* → `runbook-scaffold` / `scaffold-edf-component`, then dispatch `edf-author`.
- *"Does it pass?"* → `edf-validate` (CLI) or dispatch `edf-doc-reviewer` for narrative review.
- *"Run it."* → dispatch `runbook-strategist` first, then `runbook-executor`.
- *"What's in the graph?"* → `neo4j-cypher-patterns`.

The validator is a checker only — there is no `--fix` flag (see
[`AGENTS.md`](../AGENTS.md) under "edf plugin — conventions"). It
emits `EDF001`–`EDF005` and free-form `W*` warnings.

### 4.3 KBaC plugin surface

`plugins/kbac` ships:

**Skills (5)**

| Skill | Purpose |
|---|---|
| `kbac-init` | Set up / repair the local kbac repo and Neo4j container |
| `kbac-cyphers` | Authoring `.cypher` seed files, constraints, indexes |
| `kbac-schemas` | Designing TypeBox node/relationship schemas |
| `kbac-queries` | Building reusable parameterized query templates |
| `kbac-toolchain` | CLI surface — `kbac`, `cypher-shell`, `yarn db:*` |

**Agents (2)**

| Agent | Role |
|---|---|
| `kbac-cypher-reviewer` | Reviews Cypher for safety, parameterization, idempotency |
| `kbac-schema-sync-checker` | Detects drift between TypeBox schemas and the live graph |

**Command (1)** — `/kbac` —
[`plugins/kbac/commands/kbac.md`](../plugins/kbac/commands/kbac.md):

```text
/kbac <term> [--type Tool|Concept|Domain|System] [--limit 1-100]
```

Fulltext search across the graph via the `kbac` CLI. Always passes
`--json` for machine-readable output, surfaces typed errors (Neo4j
unreachable, schema mismatch, etc.), and renders results as a
Markdown list.

**Hook** — SessionStart, defined in
[`plugins/kbac/hooks/hooks.json`](../plugins/kbac/hooks/hooks.json):

```json
{
  "SessionStart": [{
    "matcher": "startup|clear|compact",
    "hooks": [{
      "type": "command",
      "command": "tsx ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/kbac-session-context.ts",
      "timeout": 15
    }]
  }]
}
```

On every session start (and after `/clear` or `/compact`), the hook
injects the **current** node-label schema, relationship types, seed
file inventory, and query templates into context. This is what makes
"schema first" actually achievable — Claude does not have to guess
the graph shape.

### 4.4 Using EDF and KBaC together

The two plugins are designed to share work. The boundaries are
explicit in the skills themselves:

| Task | Use which plugin |
|---|---|
| Choose orchestration structure (runbook / tree / workflow / checklist) | `edf:orchestration-patterns` |
| Author a new orchestration document | `edf:runbook-authoring` + `edf:edf-authoring` |
| Validate an EDF document | `edf:edf-validate`, `edf:plugin-edf-audit` |
| Execute an authored runbook | `edf:runbook-strategist` → `edf:runbook-executor` |
| Query the EDF-owned node types (`Plugin`, `Component`, `Phase`, `ValidationResult`, …) | `edf:neo4j-cypher-patterns` |
| Design new node labels or relationship types | `kbac:kbac-schemas` |
| Write `.cypher` seed files / constraints / indexes | `kbac:kbac-cyphers` |
| Build reusable parameterized query templates | `kbac:kbac-queries` |
| Search the kbac graph by term | `/kbac <term>` |
| Detect drift between TypeBox schemas and the live graph | `kbac:kbac-schema-sync-checker` |
| Review a Cypher query for safety / idempotency | `kbac:kbac-cypher-reviewer` |

The intended flow for a non-trivial procedure is:

1. **Plan.** Use `edf:orchestration-patterns` to pick a structure.
2. **Author.** Use `edf:runbook-scaffold` or `edf:scaffold-edf-component`. If the procedure needs to consult domain knowledge, embed a decision tree whose gates query KBaC.
3. **Schema-check the graph reads.** Before any query, the SessionStart hook from `plugins/kbac` has already injected the current schema; cross-reference it with `kbac:kbac-queries`. For EDF-owned node types, use `edf:neo4j-cypher-patterns`.
4. **Validate.** Run `edf:edf-validate` on the document. It must come back clean (`EDF001`–`EDF005`).
5. **Pre-flight.** Dispatch `edf:runbook-strategist` for a readiness assessment.
6. **Execute.** Dispatch `edf:runbook-executor`. As the runbook runs, gates that consult the graph use the `/kbac` command (fulltext) or direct Cypher (typed).
7. **Persist outcomes.** Each phase's `ValidationResult` / `DriftReport` is MERGEd back into the graph using the patterns in `edf:neo4j-cypher-patterns`. The next run's gates see them.

Two practical reminders that recur in `AGENTS.md`:

- **EDF validator lives in the `edf` repo.** Run it from there:
  `cd /path/to/austyle-io/edf && pnpm exec tsx src/validator/cli.ts /path/to/this/plugin`.
  The `@` in the npm package scope is not part of the on-disk path.
- **The kbac SessionStart hook needs its deps materialized once.**
  After cloning the marketplace, run `yarn install` inside
  `plugins/kbac/hooks/`. The hook directory uses
  `nodeLinker: node-modules` (not PnP), so plain `tsx` invocation
  works.

---

## 5. Reference

**Upstream repos**

- [`austyle-io/edf`](https://github.com/austyle-io/edf) — library, schemas, templates, validator CLI
  - [`docs/INDEX.md`](https://github.com/austyle-io/edf/blob/main/docs/INDEX.md) — documentation index with reading tracks
  - [`docs/systems/edf/SYSTEM.md`](https://github.com/austyle-io/edf/blob/main/docs/systems/edf/SYSTEM.md) — system architecture
  - [`docs/systems/decision-trees/SYSTEM.md`](https://github.com/austyle-io/edf/blob/main/docs/systems/decision-trees/SYSTEM.md) — decision-tree parser
  - [`docs/systems/runbook-orchestration/SYSTEM.md`](https://github.com/austyle-io/edf/blob/main/docs/systems/runbook-orchestration/SYSTEM.md) — runbook executor
  - [`docs/guides/EDF-WORKFLOW-ORCHESTRATION.md`](https://github.com/austyle-io/edf/blob/main/docs/guides/EDF-WORKFLOW-ORCHESTRATION.md) — workflow authoring guide
- [`austyle-io/kbac`](https://github.com/austyle-io/kbac) — Neo4j graph, schemas, seed cypher, CLI
  - [`docs/ARCHITECTURE.md`](https://github.com/austyle-io/kbac/blob/main/docs/ARCHITECTURE.md) — stack, ports, credential flow, design decisions
  - [`docs/META-FRAMEWORKS.md`](https://github.com/austyle-io/kbac/blob/main/docs/META-FRAMEWORKS.md) — TypeBox+AJV, Neo4j+Docker, Cypher as Code

**In this repo**

- [`README.md`](../README.md) — marketplace install and command reference
- [`AGENTS.md`](../AGENTS.md) — plugin conventions, `edf` and `kbac` constraints, full Claude Code plugin / marketplace lifecycle
- [`plugins/edf/`](../plugins/edf/) — agents + skills for EDF
- [`plugins/edf/skills/orchestration-patterns/SKILL.md`](../plugins/edf/skills/orchestration-patterns/SKILL.md) — 4-structure selection + composition patterns
- [`plugins/edf/skills/neo4j-cypher-patterns/SKILL.md`](../plugins/edf/skills/neo4j-cypher-patterns/SKILL.md) — EDF graph node types + query patterns
- [`plugins/kbac/`](../plugins/kbac/) — skills, agents, hook, `/kbac` command
- [`plugins/kbac/commands/kbac.md`](../plugins/kbac/commands/kbac.md) — `/kbac` search command
- [`plugins/kbac/hooks/hooks.json`](../plugins/kbac/hooks/hooks.json) — SessionStart graph-context injection
