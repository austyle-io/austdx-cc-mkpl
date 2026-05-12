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

The validator currently checks two things:

1. **Reference integrity** — Every reference in a document (frontmatter
   `related:` entries, body `<ref>` tags) must resolve to a known target.
   Reports `EDF001` for missing targets, `EDF003` for version mismatches,
   `EDF004` for malformed reference strings, and `EDF005` when a Neo4j
   target is not present in the graph.
2. **Circular reference detection** — No document may form a cycle through
   its references. Reports `EDF002` with the cycle path.

Other rules in `edf-validation-rules` (frontmatter shape, layer structure,
naming conventions, XML tag balance) are documented contracts but are not
currently emitted as codes by the CLI. Surface those as narrative findings
via the `edf-doc-reviewer` agent.

## Invocation

The validator is a TypeScript CLI run via `tsx`. From the
`@austyle-io/edf` library directory:

### Directory (recursive)

```bash
yarn tsx src/validator/cli.ts /path/to/plugin
```

### Single file

```bash
yarn tsx src/validator/cli.ts --file /path/to/document.md
```

### Help

```bash
yarn tsx src/validator/cli.ts --help
```

The validator exits with status 0 when all documents pass and non-zero
when one or more fail. There is no glob input, no JSON output mode, and
no auto-fix at this time.

## Output

Default output prints a per-document line plus a registry summary:

```text
Validating EDF registry {"path":"/path/to/plugin"}
...
Registry validation complete {"valid":true,"documentsChecked":24,...}
============================================================
EDF Registry Validation Report
Timestamp: 2026-05-12T...
============================================================

Registry: /path/to/plugin
Status: VALID

Summary:
  Documents checked: 24
  Documents with errors: 0
  Total errors: 0
  Total warnings: 0
```

On failure, each affected document lists the error codes it emitted:

```text
Status: INVALID

  plugins/example/agents/broken.md
    EDF001  line 12: reference "skill:missing-thing" does not resolve
    EDF002  cycle detected: a -> b -> c -> a
```

## Error codes

The validator emits a small, fixed set of error codes plus free-form
warning strings. Treat these as the stable contract.

| Code     | Severity | Trigger                                       |
| -------- | -------- | --------------------------------------------- |
| `EDF001` | error    | Reference target not found                    |
| `EDF002` | error    | Circular reference detected                   |
| `EDF003` | error    | Version constraint not met                    |
| `EDF004` | error    | Invalid reference format                      |
| `EDF005` | error    | Neo4j target not in graph                     |
| `W*`     | warning  | Free-form warning code, opaque string         |

For the rules behind each code and the broader Doc-only rules catalog,
see the `edf-validation-rules` skill.

## Common failures and fixes

- **`EDF001` reference target not found** — The cited component does not
  exist. Confirm the name is correct and the target file is present;
  for cross-plugin references, include the `plugin:` prefix.
- **`EDF002` circular reference** — The validator prints the cycle path.
  Break the cycle by removing one of the back-references.
- **`EDF003` version mismatch** — A reference declared a version
  constraint that the target no longer satisfies. Update the reference
  or the target's declared version.
- **`EDF004` invalid reference format** — The reference string is
  malformed. Re-check against the reference forms in
  `edf-validation-rules`.
- **`EDF005` Neo4j target missing** — A reference points at a Neo4j
  node that does not exist in the graph. Sync the graph or correct the
  reference.

## Companion components

- **`edf-doc-reviewer` agent** — Dispatch for narrative review of a
  document beyond mechanical validation: clarity, completeness, layer
  assignment, audience fit. Use after this skill passes.
- **`edf-validation-rules` skill** — The canonical rules reference: the
  validator-emitted code table, the Doc-only rules catalog, frontmatter
  contract, and naming conventions.
