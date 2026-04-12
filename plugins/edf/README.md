# edf — Enhanced Document Format toolkit

Companion Claude Code plugin to the [`@austyle-io/edf`](https://github.com/austyle-io/edf)
TypeScript library. Provides agents and skills for authoring, validating, and
orchestrating EDF documents.

## What is EDF?

EDF (Enhanced Document Format) is a progressive-disclosure flavor of markdown
with YAML frontmatter, semantic XML tags, and a 4-layer load model. It is
designed for AI orchestration artifacts: agents, skills, runbooks,
decision-trees, and system-architecture docs.

For format details see the `edf-authoring` and `edf-validation-rules` skills,
or the companion library's README.

## Components

### Agents (5)

| Agent | Role |
|---|---|
| `edf-author` | Author or refactor EDF documents from intent prompts |
| `edf-doc-reviewer` | Narrative review of an existing EDF document |
| `edf-layer-advisor` | Assign content to the right 4-layer disclosure level |
| `runbook-executor` | Execute a runbook phase-by-phase with guaranteed cleanup |
| `runbook-strategist` | Pre-flight assessment of a runbook before execution |

### Skills (19)

**Authoring**
- `edf-authoring` — format reference for authoring EDF documents
- `runbook-authoring` — runbook-specific authoring reference
- `runbook-scaffold` — produce a starter runbook stub
- `scaffold-edf-component` — produce a stub for any EDF component type
- `arch-doc-scaffold` — produce a system-architecture documentation set

**Validation & audit**
- `edf-validate` — run the validator CLI on a document or directory
- `edf-validation-rules` — canonical compliance rules reference
- `edf-component-discovery` — inventory EDF components in a project
- `edf-stats` — token / size / type statistics for EDF docs
- `plugin-edf-audit` — bulk EDF compliance scan across a plugin

**Workflow patterns**
- `orchestration-patterns` — choose between runbook / decision-tree / checklist / workflow
- `migration-patterns` — patterns for safe migrations
- `iterative-refinement` — refinement loop with confidence scoring
- `skeptical-review-pattern` — structured skepticism for plans and claims

**Decision & escalation**
- `decision-protocol` — 6-option pause menu for human decision input
- `escalation-decision-tree` — when and how to escalate
- `runbook-preflight` — surface for `runbook-strategist`
- `runbook-run` — surface for `runbook-executor`

**Graph**
- `neo4j-cypher-patterns` — Cypher patterns for the EDF knowledge graph

## Usage

This plugin is meant to be installed through the parent marketplace:

```bash
/plugin marketplace add austyle-io/austdx-cc-mkpl
/plugin install edf@austdx-cc-mkpl
```

Once installed, the skills become slash-invocable (e.g. `/edf-validate`) and
the agents are dispatchable via the Agent tool (`Task` is the legacy alias).

## Validation

The plugin's documents validate cleanly against the `@austyle-io/edf` CLI:

```bash
cd /path/to/@austyle-io/edf
yarn tsx src/validator/cli.ts /path/to/this/plugin
```

The validator emits `EDF001`–`EDF005` for errors and `W*` for warnings.
See `skills/edf-validation-rules/SKILL.md` for the full rules reference.

## License

MIT — see [`./LICENSE`](./LICENSE).
