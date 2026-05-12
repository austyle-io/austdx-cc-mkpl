---
name: edf-validate
description: >
  Use when validating an EDF document (or directory of EDF documents) —
  frontmatter schema, reference integrity, layer-structure compliance, and
  convention checks. Runs the @austyle-io/edf library's validator CLI
  (`tsx src/validator/cli.ts`) and reports pass/fail with error codes.
  For deeper narrative review (not just pass/fail), dispatch the
  `edf-doc-reviewer` agent. For the rules reference, see the
  `edf-validation-rules` skill.
---

# EDF Validate

Mechanical validation of EDF-formatted documents. Runs the validator CLI
from the `@austyle-io/edf` library and surfaces pass/fail with precise
error codes. This skill is the fast, deterministic check — not a
substitute for narrative review.

## When to use this skill

- Before committing a new or modified EDF document (skill, agent,
  command, runbook, plan).
- In CI to gate merges on schema and structural compliance.
- When a downstream consumer (graph sync, registry build) fails and you
  need to know whether the source document is well-formed.
- After a bulk migration or refactor to verify the corpus.

If you want qualitative feedback on clarity, completeness, or tone,
dispatch the `edf-doc-reviewer` agent instead. If you need the actual
rule definitions and rationale, read the `edf-validation-rules` skill.

## What gets validated

The validator runs the following checks in order. Any failure terminates
that document's run and emits an error code.

1. **Frontmatter schema** — YAML frontmatter parses and conforms to the
   document type's TypeBox schema (required fields, value types,
   permitted values).
2. **Reference integrity** — Every internal reference (`@layer:N`,
   cross-document references, related links) resolves to a real target.
3. **Circular reference detection** — No document forms a cycle through
   its references.
4. **Layer structure compliance** — Layer annotations
   (`<!-- @layer:N -->`) appear in the required order with no gaps and
   no duplicates.
5. **XML / semantic tag structure** — Required tags
   (`<workflow>`, `<commentary>`, `<example>`, etc.) are well-formed
   and balanced.
6. **Convention checks** — Naming (kebab-case ids, no tool-centric
   names), description style ("Use when…" phrasing for skills), heading
   hierarchy.

## Invocation

The validator is a TypeScript CLI executed JIT via `tsx`. Always invoke
through `pnpm` per repo convention.

### Single file

```bash
pnpm exec tsx src/validator/cli.ts plugins/edf/skills/edf-validate/SKILL.md
```

### Directory (recursive)

```bash
pnpm exec tsx src/validator/cli.ts plugins/edf/skills/
```

### Glob

```bash
pnpm exec tsx src/validator/cli.ts "plugins/**/SKILL.md"
```

### Whole registry

```bash
pnpm exec tsx src/validator/cli.ts --registry
```

Defaults to the registry when no path is supplied.

## Flags

| Flag         | Default | Effect                                                     |
| ------------ | ------- | ---------------------------------------------------------- |
| `--strict`   | false   | Treat warnings as errors; exit non-zero on any issue.      |
| `--fix`      | false   | Auto-apply safe fixes (see below); re-validate after.      |
| `--json`     | false   | Emit machine-readable JSON instead of human report.        |
| `--ci`       | false   | CI mode — minimal output, exit code is the signal.         |
| `--registry` | false   | Validate every EDF document tracked in the registry.       |

## Output

Default human output prints one section per file:

```text
plugins/edf/skills/edf-validate/SKILL.md
  PASS  6 checks, 0 errors, 0 warnings
```

On failure:

```text
plugins/edf/skills/example/SKILL.md
  FAIL  6 checks, 2 errors, 1 warning
  E-FM-002  frontmatter: missing required field "description"
  E-REF-014 line 47: unresolved reference "skill: missing-thing"
  W-CONV-03 description should begin with "Use when..."
```

JSON output (`--json`) returns one object per file with `path`,
`passed`, `errors[]`, `warnings[]`, and per-check breakdown.

## Error codes

Error codes are stable across versions; treat them as your contract for
filters and CI rules. Categories:

| Prefix    | Domain                            |
| --------- | --------------------------------- |
| `E-FM-*`  | Frontmatter schema violations.    |
| `E-REF-*` | Reference integrity failures.     |
| `E-CYC-*` | Circular references.              |
| `E-LAY-*` | Layer-structure violations.       |
| `E-TAG-*` | XML / semantic tag problems.      |
| `E-CONV-*`| Convention violations (errors).   |
| `W-CONV-*`| Convention violations (warnings). |

For the authoritative list and rule rationale, see the
`edf-validation-rules` skill.

## Auto-fix (`--fix`)

The validator applies only safe, deterministic fixes. After fixing, it
re-runs validation and reports the residual issues.

Auto-fixable:

- Missing `version` defaults (adds the current schema version).
- `neo4j.labels` provided as a string — converted to array.
- Missing `neo4j.sync: true` when other `neo4j.*` fields are present.
- Layer annotations missing on otherwise-correct sections.
- Trailing whitespace and BOM stripping in frontmatter.

Not auto-fixable (require human judgement):

- Missing or weak `description`.
- Missing required sections.
- Tool-centric naming.
- Broken cross-document references.
- Cycles.

When `--fix` rewrites a file, the run prints a diff summary and lists
the codes that were resolved.

## Exit codes

| Code | Meaning                                         |
| ---- | ----------------------------------------------- |
| 0    | All files passed (or only warnings without `--strict`). |
| 1    | One or more files failed validation.            |
| 2    | Validator itself errored (bad CLI args, IO).    |

## Common failures and fixes

- **`E-FM-002 missing required field`** — Open the schema for the
  document type (in the `@austyle-io/edf` library's `schemas/`) and add
  the missing field. Most often: `description`, `name`, or one of the
  `neo4j.*` keys.
- **`E-REF-014 unresolved reference`** — The target was renamed or
  removed. Search the registry for the new id, or delete the dead link.
- **`E-LAY-007 layer gap`** — Layers must be contiguous starting at 0.
  Add the missing `<!-- @layer:N -->` marker or renumber.
- **`E-CYC-001 cycle detected`** — The validator prints the cycle path.
  Break it by removing one of the back-references.
- **`W-CONV-03 description style`** — Skill descriptions should start
  with "Use when…" so the dispatcher can match intent.

## Companion components

- **`edf-doc-reviewer` agent** — Dispatch for qualitative review:
  clarity, completeness, audience fit, redundancy. Use after this skill
  passes.
- **`edf-validation-rules` skill** — The full rule catalogue and the
  rationale for each error code.
- **`edf-authoring` skill** — Patterns for writing EDF documents that
  pass validation on the first run.

## Workflow

1. Run this skill on the file or directory you changed.
2. If it fails, fix the errors (use `--fix` for the safe ones) and
   re-run until clean.
3. If it passes and the document is non-trivial, dispatch
   `edf-doc-reviewer` for narrative review.
4. Commit only after both mechanical and narrative passes are green.
