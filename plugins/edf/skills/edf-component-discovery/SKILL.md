---
name: edf-component-discovery
description: >
  Use when discovering, listing, or inventorying EDF components in a project
  — find all agents/skills/commands/runbooks/decision-trees, build component
  catalogs, or audit what EDF surface exists. Scans directories, parses
  frontmatter, reports an inventory by component type. Pair with
  `plugin-edf-audit` skill when you want compliance findings on the
  discovered components.
---

<!-- @layer:1 -->

# EDF Component Discovery

Build an inventory of EDF components — agents, skills, commands, runbooks,
decision-trees, and other structured artifacts — within a project. Scan
the filesystem, parse frontmatter signals, and produce a catalog grouped
by component type.

This skill answers questions like:

- "What EDF components live in this plugin?"
- "List every skill / agent / command."
- "Show me all the runbooks."
- "Audit the EDF surface area before we refactor."

If the caller wants **compliance findings** on the discovered components
(missing fields, malformed frontmatter, broken cross-references), pair
this skill with the `plugin-edf-audit` or `edf-validate` skills. This
skill only *finds* things — it does not judge them.

## Scan paths

EDF components follow Claude Code's plugin layout. A discovery pass should
walk these locations relative to the target root (typically a plugin
directory like `plugins/<name>/` or a repo's `.claude/` directory):

| Component type   | Path pattern                       | File shape          |
| ---------------- | ---------------------------------- | ------------------- |
| Agents           | `agents/*.md`                      | single file         |
| Commands         | `commands/**/*.md`                 | single file, nested ok |
| Skills           | `skills/<slug>/SKILL.md`           | folder + SKILL.md   |
| Skill resources  | `skills/<slug>/**/*.md`            | templates, refs, examples |
| Runbooks         | `skills/<slug>/runbooks/*.md` or `runbooks/*.md` | single file |
| Decision-trees   | `skills/<slug>/decision-trees/*.md` or `decision-trees/*.md` | single file |
| Plugin manifest  | `.claude-plugin/plugin.json`       | identifies a plugin root |
| Marketplace      | `.claude-plugin/marketplace.json`  | lists plugins       |

If the target root is unclear, look for `.claude-plugin/plugin.json` or
`plugins/*/` directories to anchor the scan. A repo can host multiple
plugins; discover each independently and tag findings with their plugin
slug.

## Component identification

For each file found, determine the component type using both **location**
and **frontmatter**. Location is authoritative when frontmatter is absent
or ambiguous.

### Frontmatter signals

EDF and Claude Code components carry YAML frontmatter at the top of the
file. Key fields:

- `name:` — the canonical slug (e.g. `edf-authoring`)
- `description:` — used for skill/agent triggering
- `argument-hint:` — present on commands
- `allowed-tools:` — present on commands and agents
- `tools:` / `model:` — present on agents
- `edf:` — legacy block (id, version, type, neo4j labels). When present,
  `edf.type` declares the component type directly.

A modern skill has only `name` + `description`. A legacy SDLC-heroes
component has an `edf:` block, a `related:` block, often a `version:`
field, and may include `<example>` blocks in the body. Treat the legacy
block as informational — the new skills format drops it.

### Type inference rules

When deciding what a file is, apply in order:

1. If `edf.type` is set → use it.
2. Else if the path matches a known pattern in the table above → use that
   type.
3. Else if frontmatter has `argument-hint` or `allowed-tools` but no
   `tools` → likely a command.
4. Else if frontmatter has `tools` or `model` → likely an agent.
5. Else if the file is named `SKILL.md` → it is a skill.
6. Otherwise → mark as `unknown` and surface it for manual review.

## Discovery procedure

Follow this sequence when invoked:

1. **Resolve the scan root.**
   - If the user named a plugin (e.g. "discover EDF components in the edf
     plugin"), resolve to `plugins/<slug>/`.
   - If they said "this project" or named no root, start at the repo
     root and walk all `plugins/*/` directories plus any top-level
     `agents/`, `commands/`, `skills/` folders.
   - If they passed a path, trust it.

2. **Enumerate candidate files.** Prefer one of these in order of
   availability:
   - `fd` (fast, modern): `fd -e md . <root>/agents <root>/commands <root>/skills`
   - `rg --files` with a glob: `rg --files -g '*.md' <root>`
   - `find` fallback: `find <root> -type f -name '*.md'`

   Always pass an explicit root — never scan from `/`.

3. **Parse frontmatter.** For each candidate, read the first 40-80 lines
   and extract the YAML frontmatter block (between the leading `---`
   fences). Capture: `name`, `description`, `edf.type`, `edf.version`,
   `argument-hint`, `tools`, `model`, `related.*`.

4. **Classify.** Apply the type-inference rules above. Tag each entry
   with `{ plugin, type, name, path, description, version?, related? }`.

5. **De-duplicate.** A skill's `SKILL.md` is the canonical entry — do
   not list every template/reference under `skills/<slug>/` as a
   separate component. Roll those up as `resources: N` on the parent
   skill.

6. **Filter (optional).** If the caller passed a type filter
   (`type=skill`, `type=agent`, etc.) or a name pattern, narrow the
   results before output.

7. **Report.** Use the format below.

## Filter options

When the caller specifies filters, honor them:

- **By type** — `agents`, `skills`, `commands`, `runbooks`,
  `decision-trees`, `all` (default).
- **By plugin** — limit to one plugin slug.
- **By name pattern** — substring or glob match against `name`.
- **By status** — `legacy` (has `edf:` block) vs `modern` (no `edf:`
  block) vs `all`.

State the active filters in the report header so the caller knows what
was excluded.

## Output format

Default to a markdown report. Switch to JSON only if the caller asks for
machine-readable output.

```markdown
## EDF Component Inventory

**Root**: <absolute path>
**Filters**: type=<...> plugin=<...> status=<...>
**Total components**: <N> across <M> plugins

### Plugin: <plugin-slug>

#### Agents (<n>)
- **<name>** — <description, truncated to ~100 chars>
  - Path: <relative path from root>
  - Status: modern | legacy (edf v<x>)
  - Tools: <list or "all">

#### Skills (<n>)
- **<name>** — <description>
  - Path: <relative path>
  - Status: modern | legacy
  - Resources: <count of supporting files>

#### Commands (<n>)
- **<name>** — <description>
  - Path: <relative path>
  - Argument hint: <if present>

#### Runbooks (<n>)
- **<name>** — <description>
  - Path: <relative path>

#### Decision-trees (<n>)
- **<name>** — <description>
  - Path: <relative path>

### Unclassified (<n>)
Files that matched the scan but could not be confidently typed:
- <path> — <reason>
```

For a single-plugin scan, drop the "Plugin: ..." header.

For JSON output:

```json
{
  "root": "/abs/path",
  "filters": { "type": "all", "plugin": null, "status": "all" },
  "plugins": [
    {
      "slug": "edf",
      "components": {
        "agents":  [{ "name": "...", "path": "...", "description": "...", "status": "modern" }],
        "skills":  [{ "name": "...", "path": "...", "description": "...", "status": "modern", "resources": 0 }],
        "commands": [{ "name": "...", "path": "...", "description": "...", "argument_hint": "..." }],
        "runbooks": [],
        "decision_trees": []
      }
    }
  ],
  "unclassified": []
}
```

## Edge cases

- **Files without frontmatter.** Capture as `unclassified` with reason
  `no-frontmatter`. Do not guess.
- **Multiple components in one file.** Rare, but the legacy heroes
  format sometimes embedded sub-components. Report the parent and note
  the embeds in `description`.
- **Symlinks.** Resolve and de-dupe by realpath. Do not follow symlinks
  out of the scan root.
- **Hidden directories.** Skip `node_modules`, `.git`, `dist`, `build`,
  `.next`, `coverage` even if `agents/` or `skills/` appears under
  them.
- **Marketplace plugins.** If `.claude-plugin/marketplace.json` lists
  external plugin sources, do not fetch them. Report the manifest path
  and note `external: true`.

## Optional: Neo4j enrichment

If the caller has a `neo4j-memory` MCP server connected and the project's
knowledge graph syncs EDF components, you may enrich the inventory with
relationship counts:

```cypher
MATCH (c:Component {plugin: $plugin, name: $name})
OPTIONAL MATCH (c)-[r]->(other:Component)
RETURN c.type AS type, count(r) AS outgoing_refs,
       collect(DISTINCT other.name)[..5] AS sample_refs
```

This is **optional**. Skip silently if Neo4j is unavailable — the
filesystem inventory is the source of truth.

## When NOT to use this skill

- The caller wants to **validate** components → use `edf-validate`
  (single doc) or `plugin-edf-audit` (bulk).
- The caller wants to **author** a new component → use `edf-authoring`
  or the `edf-author` agent.
- The caller wants to **search by semantic intent** ("find me a skill
  that does X") — that is a different problem; recommend reading the
  inventory then ranking by description match.
