---
name: edf-validation-rules
description: >
  Use when authoring or reviewing EDF documents and needing the compliance
  rules reference: required frontmatter fields, allowed semantic XML tags,
  4-layer disclosure structure, reference integrity, naming conventions,
  and severity levels. Distinct from the `edf-validate` skill which RUNS
  the validator CLI — this skill is the *rules reference*.
---

# EDF Validation Rules

The authoritative rules reference for the Extensible Document Format (EDF).
This document defines *what compliance means*: required frontmatter, allowed
semantic tags, the 4-layer disclosure structure, reference integrity, naming
conventions, and severity levels. Use this alongside the `edf-validate` skill
(which runs the CLI) and the `edf-doc-reviewer` agent (which applies these
rules during reviews).

## Component Types

EDF documents come in four flavors. Required fields and behavior differ per type.

| Type      | Purpose                                | Lives in           |
| --------- | -------------------------------------- | ------------------ |
| `agent`   | Autonomous task executor               | `agents/*.md`      |
| `skill`   | Knowledge or capability module         | `skills/*/SKILL.md`|
| `command` | User-invokable slash command           | `commands/*.md`    |
| `hook`    | Event-triggered automation             | `hooks/*.md`       |

## Frontmatter — Required Fields

### Universal (all component types)

| Field         | Type      | Format / Allowed values                          |
| ------------- | --------- | ------------------------------------------------ |
| `name`        | string    | kebab-case, must match file/directory name       |
| `description` | string    | Multi-line allowed; must start with "Use when…"  |

### Agent-only

| Field   | Type    | Allowed values                                 |
| ------- | ------- | ---------------------------------------------- |
| `tools` | array   | Subset of available Claude Code tools          |
| `model` | string  | `opus` \| `sonnet` \| `haiku` (optional)       |
| `color` | string  | Hex code or named color (optional, UI hint)    |

### Command-only

| Field           | Type   | Notes                                       |
| --------------- | ------ | ------------------------------------------- |
| `argument-hint` | string | Usage hint shown in autocomplete (optional) |

### Forbidden in modern EDF (all component types)

These fields appeared in legacy v2.0.0 documents and must be **stripped** on
migration regardless of component type. The `edf-validate` CLI flags them.

| Field         | Why removed                                                   |
| ------------- | ------------------------------------------------------------- |
| `edf:` block  | Schema versioning and Neo4j sync now handled externally       |
| `version:`    | Per-document versions diverged from plugin version            |
| `related:`    | Cross-references go in body prose, not frontmatter            |

### Restricted to agents

| Field    | Notes                                                            |
| -------- | ---------------------------------------------------------------- |
| `model:` | Valid on agent files only. Skills and commands must not declare it. |

## Semantic XML Tags

EDF documents use a small set of semantic tags inside the markdown body.
The validator parses these and checks allowed-content rules.

### Tag catalog

| Tag                 | Purpose                                  | Allowed content                       |
| ------------------- | ---------------------------------------- | ------------------------------------- |
| `<summary>`         | One-sentence description of the doc      | Plain text, 1–2 sentences             |
| `<goal>`            | Clear objective statement                | Plain text, single paragraph          |
| `<trigger-signals>` | Activation patterns / matching phrases   | Bulleted list of quoted phrases       |
| `<constraints>`     | Operational boundaries                   | Bulleted list of "MUST/NEVER" rules   |
| `<workflow>`        | Multi-step procedure container           | One or more `<step>` children         |
| `<step>`            | Single workflow step                     | Plain text + optional attributes      |
| `<Note>`            | Informational callout                    | Plain text                            |
| `<Warning>`         | Caution callout for risky behavior       | Plain text                            |
| `<Tip>`             | Best practice or shortcut                | Plain text                            |

### Tag attribute rules

| Tag         | Attribute | Required | Allowed values                          |
| ----------- | --------- | -------- | --------------------------------------- |
| `<workflow>`| `name`    | yes      | kebab-case identifier                   |
| `<step>`    | `order`   | yes      | positive integer, sequential, 1-indexed |
| `<step>`    | `name`    | no       | kebab-case identifier                   |

### Removed in modern EDF

The legacy `<example>` / `<commentary>` block convention is **no longer
required** in modern skills. Examples now live in prose with fenced code blocks.
The validator does not flag their absence; it does flag malformed leftovers.

## 4-Layer Progressive Disclosure

Long EDF documents are divided into four layers marked by HTML comments.
The Claude Code runtime loads layers on demand to control context size.

### Layer definitions

| Layer                              | Annotation                                | Loaded when           | Typical size       |
| ---------------------------------- | ----------------------------------------- | --------------------- | ------------------ |
| Layer 1 — Executive Briefing       | `<!-- @layer:1 -->`                       | Always                | ~200 tokens        |
| Layer 2 — Operational Context      | `<!-- @layer:2 -->`                       | On task match         | ~600–1000 tokens   |
| Layer 3 — Implementation Detail    | `<!-- @layer:3 load="on-demand" -->`      | Requested by model    | ~800–1500 tokens   |
| Layer 4 — Reference                | `<!-- @layer:4 load="on-failure" -->`     | After error/failure   | ~1000+ tokens      |

### Layer content rules

| Layer                              | Should contain                                            | Should NOT contain         |
| ---------------------------------- | --------------------------------------------------------- | -------------------------- |
| Layer 1 — Executive Briefing       | Identity, summary, goal, triggers                         | Workflows, examples        |
| Layer 2 — Operational Context      | Rules, decision logic, primary workflows                  | Long examples              |
| Layer 3 — Implementation Detail    | Worked examples, advanced patterns                        | Core identity              |
| Layer 4 — Reference                | Troubleshooting, edge cases, citations, debugging         | Initial rules              |

### Layer compliance

- **Layer 1 — Executive Briefing** is **mandatory** for every EDF document.
- **Layer 2 — Operational Context**, **Layer 3 — Implementation Detail**, and
  **Layer 4 — Reference** are **optional** but if present must appear in order.
- Layer markers must be HTML comments, not headings or front-matter keys.
- A layer marker applies until the next marker or end-of-file.
- Short skills (<200 lines) may omit layer markers entirely.

## Reference Integrity

EDF documents frequently reference other components by name. The validator
checks these references resolve.

### Reference forms

| Form                       | Resolves to                                      |
| -------------------------- | ------------------------------------------------ |
| `` `skill-name` ``         | A skill directory in the same plugin             |
| `` `agent-name` ``         | An agent file in the same plugin                 |
| `` `/command-name` ``      | A slash command in the same plugin               |
| `plugin:component`         | A component in a different plugin                |

### Reference rules

- Every backticked name that matches a component-name pattern must resolve.
- Cross-plugin references must include the `plugin:` prefix.
- Dangling references (component does not exist) are **errors**.
- Unprefixed references that match no local component are **errors**.

## Naming Conventions

### Capability-centric (preferred)

Names describe *what the component does*, not *what tool it uses*.

| Good                              | Bad                       |
| --------------------------------- | ------------------------- |
| `database-migration-patterns`     | `postgres-mastery`        |
| `e2e-browser-automation`          | `playwright-testing`      |
| `api-integration-strategies`      | `axios-client`            |
| `test-coverage-analysis`          | `jest-expertise`          |

### Reserved prefixes (never use)

These prefixes are reserved for tool-specific bindings managed elsewhere.
Using them on a custom component triggers a validation error.

- `mcp-*` — MCP server bindings
- `neo4j-*` — Neo4j tool bindings
- `playwright-*` — Browser automation bindings
- `docker-*` — Container tool bindings
- `github-*` — GitHub API bindings
- `read-*`, `write-*`, `edit-*` — Built-in tool bindings

### Acceptable suffixes

These suffixes signal the component's role. Use them when natural; do not
force them on every name.

- `-patterns` — Coding or design patterns
- `-strategies` — Methodologies and approaches
- `-protocols` — Procedures and protocols
- `-analysis` — Analytical frameworks
- `-automation` — Workflow automation
- `-rules` — Rule references (this skill)

### File and directory names

| Component | Path pattern                          |
| --------- | ------------------------------------- |
| Agent     | `agents/<name>.md`                    |
| Skill     | `skills/<name>/SKILL.md`              |
| Command   | `commands/<name>.md`                  |
| Hook      | `hooks/<name>.md`                     |

The `name` frontmatter field must match `<name>` exactly.

## Severity Levels

The validator classifies findings by severity.

| Level     | Meaning                                       | CI behavior         |
| --------- | --------------------------------------------- | ------------------- |
| `error`   | Document is non-compliant; ship-blocker       | Fails the build     |
| `warning` | Likely defect; should be fixed before merge   | Surfaces in review  |
| `info`    | Style or convention nudge                     | Reported, not gated |

### Validator-emitted error codes

The shipping `@austyle-io/edf` validator (`src/validator/cli.ts`) currently emits
a fixed set of error codes. Quote them verbatim when citing findings.

| Code     | Trigger                                       |
| -------- | --------------------------------------------- |
| `EDF001` | Reference target not found                    |
| `EDF002` | Circular reference detected                   |
| `EDF003` | Version constraint not met                    |
| `EDF004` | Invalid reference format                      |
| `EDF005` | Neo4j target not in graph                     |

Warnings carry free-form `W*` codes (for example `W001`). Treat the code string
as opaque and quote it as-is.

### Doc-only rules (not yet enforced by the CLI)

The rules below are documented contracts but are **not currently emitted as
codes by the validator**. Reviewers should flag them in narrative findings;
authors should follow them by convention.

- Frontmatter `name` present and matches file/directory name.
- `description` begins with `Use when` and is at least 40 characters.
- No forbidden frontmatter fields (`edf:`, `version:`, `related:`).
- Agent files include a `tools:` array.
- Component names avoid reserved prefixes (see Naming Conventions).
- `<workflow>` carries a `name` attribute; `<step>` `order` is sequential from 1.
- Layer markers appear in order starting at Layer 1 — Executive Briefing.

When the validator gains support for these checks, this section moves into
the table above.

## Validation Checklist

A document passes validation when all of the following hold. The
`edf-validate` skill runs this as an automated check; the `edf-doc-reviewer`
agent uses it as a manual review checklist.

- [ ] Frontmatter parses as valid YAML.
- [ ] `name` is present, kebab-case, and matches file/directory.
- [ ] `description` starts with "Use when…" and is at least 40 characters.
- [ ] No forbidden fields (`edf:`, `version:`, `related:`) in frontmatter.
- [ ] Agent files include `tools:` array.
- [ ] Component name does not use a reserved prefix.
- [ ] Every backticked component reference resolves.
- [ ] If layer markers exist, they appear in order starting with Layer 1 — Executive Briefing.
- [ ] Every `<workflow>` has a `name` attribute.
- [ ] Every `<step>` has sequential `order` attributes starting at 1.
- [ ] No malformed XML tags (unclosed, mismatched, or unknown).

## Companion components

- `edf-validate` skill — runs the CLI validator against these rules.
- `edf-doc-reviewer` agent — applies these rules during document reviews.
- `edf-authoring` skill — guidance for *writing* compliant documents (this
  skill defines the rules; that skill teaches how to follow them).
