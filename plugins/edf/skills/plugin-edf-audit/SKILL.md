---
name: plugin-edf-audit
description: >
  Use when auditing a Claude Code plugin (or marketplace of plugins) for EDF
  compliance — scanning for missing or malformed frontmatter, broken
  references, layer-structure issues, and convention violations. Produces
  a per-file findings report. Pair with the `edf-doc-reviewer` agent for
  narrative review and the `edf-validate` skill for single-document
  validation.
  For quantitative metrics only (token counts, doc counts), use
  `edf-stats` instead — this skill produces qualitative findings.
---

# Plugin EDF Audit

Audits a Claude Code plugin (one plugin or a whole marketplace) for EDF
compliance. Walks every component file, validates frontmatter and layer
structure, checks reference integrity, and emits a structured findings report
grouped by file. Distinct from `edf-validate` (single-document CLI run) and
the `edf-doc-reviewer` agent (narrative qualitative review) — this skill is
the *bulk programmatic scan*.

Use `edf-validation-rules` as the rules reference; this skill describes *how
to apply those rules at plugin scope*.

## When to Run

- "Audit `<plugin-name>` for EDF compliance"
- "Scan the marketplace for non-compliant components"
- "What's missing from this plugin's frontmatter?"
- "Are all the references in this plugin reachable?"
- Before publishing a plugin or accepting an external contribution
- After a bulk migration, to confirm the migrated set passes

## Scope Selection

Confirm the scope before scanning. Options:

| Scope               | Meaning                                              |
| ------------------- | ---------------------------------------------------- |
| Single plugin       | One `plugins/<name>/` directory                      |
| Marketplace         | All plugins under a `plugins/` root                  |
| Component subset    | Only `agents/`, only `skills/`, only `commands/`, etc. |
| Changed files only  | Restrict to files touched in current git diff        |

If the user doesn't specify, ask which scope applies — auditing an entire
marketplace can produce thousands of findings and isn't usually what's wanted.

## What to Scan

For each plugin in scope, enumerate component files in this order so the
report groups cleanly:

1. `plugin.json` (manifest itself)
2. `agents/*.md`
3. `skills/*/SKILL.md` (and any companion files referenced from the skill)
4. `commands/*.md`
5. `hooks/*.md` and `hooks/*.json`

Skip non-component files (`README.md`, `LICENSE`, etc.) unless the user
asks otherwise.

## Audit Checks (Per File)

Run every applicable check from `edf-validation-rules`. Group them as
follows so findings are easy to triage.

### A. Frontmatter Integrity

- [ ] Frontmatter block exists and parses as valid YAML
- [ ] Required fields present (`name`, `description`) for every type
- [ ] Type-specific required fields present (e.g., agent `tools`, `model`)
- [ ] `name` matches the file/directory name
- [ ] `description` starts with "Use when…" (modern skill convention)
- [ ] No deprecated fields (`edf:`, `related:`, `version:`, `hero:`,
  `<example>` blocks) on modern components
- [ ] `allowed-tools` only present where it shapes execution
- [ ] No empty string or `null` for required string fields

### B. Layer Structure (skills only)

- [ ] Optional 4-layer markers (`<!-- @layer:N -->`) — if any layer marker
  exists, all referenced layers must be present in order
- [ ] No layer marker appears below a deeper layer (no out-of-order)
- [ ] Semantic tags (`<summary>`, `<goal>`, `<trigger-signals>`, etc.) close
  properly and aren't nested incorrectly

### C. Reference Integrity

For every cross-reference (skill → skill, agent → command, command → skill):

- [ ] Target file exists at the expected path
- [ ] Target's `name` field matches the reference
- [ ] No references to deleted/renamed components
- [ ] No references that escape the plugin without a fully-qualified path

### D. Naming & Convention

- [ ] Filename is kebab-case
- [ ] Directory name matches `name` field
- [ ] No reserved/conflicting names (`init`, `help`, `review` — these clash
  with Claude Code built-ins unless namespaced)
- [ ] Plugin namespace prefix used on user-facing slash commands where
  appropriate

### E. Content Sanity

- [ ] File is non-empty below the frontmatter
- [ ] No leftover migration artifacts (`TODO: migrate`, `<!-- old format -->`)
- [ ] No emoji in body unless explicitly intentional (per global style)
- [ ] No remaining `sdlc-heroes` lore tokens (`the-prospector`,
  `the-narrator`, etc.) on components that have been generalized

## Severity Levels

Classify every finding so the report is actionable:

| Severity   | Meaning                                                       | Examples                                              |
| ---------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `error`    | Component will fail to load, route, or be discovered          | Missing `name`, invalid YAML, broken file reference   |
| `warning`  | Component loads but violates a convention or risks confusion  | Description doesn't start with "Use when…", emoji in body |
| `info`     | Cosmetic or future-deprecation; doesn't block                 | Deprecated field still present, layer marker missing  |

`error`-level findings block "compliant" status for the file. The plugin is
compliant only when every file is `error`-free.

## Report Format

Emit one report per audit run. Structure:

```markdown
# EDF Audit — <scope>

## Summary
- Files scanned: N
- Compliant: M
- Errors: X across Y files
- Warnings: A across B files
- Info: C across D files

## Findings by File

### `<relative/path/to/file.md>`
- **error** [frontmatter.name] field missing
- **warning** [convention.description] does not start with "Use when…"
- **info** [layer.marker] no `<!-- @layer:1 -->` marker found

### `<relative/path/to/next-file.md>`
...

## Files With Zero Findings
- `<path>`
- `<path>`
```

Findings inside each file are ordered: errors first, then warnings, then
info. Each finding tags its check category in brackets so the user can
grep the report.

## Exit Conditions

- **Pass:** Zero `error`-level findings across all scanned files. Report
  still surfaces warnings and info.
- **Fail:** Any `error`-level finding. Do not claim "EDF compliant" until
  every error is resolved.
- **Partial:** If the audit aborted (parse error in a file, scope
  misconfigured), report what was scanned and what was skipped. Never
  silently truncate.

## Workflow

1. Confirm scope with the user if ambiguous.
2. Enumerate files in scope (use `fd` or `find` — don't shell-glob a huge
   tree).
3. For each file: parse frontmatter, run the applicable check groups,
   collect findings.
4. Resolve reference targets *after* all files are parsed (need the full
   `name` → path map first).
5. Emit the structured report.
6. If running in CI, exit non-zero on any `error` finding. If running
   interactively, summarize and ask whether to autofix the trivially
   fixable ones (e.g., add missing `<!-- @layer:N -->` markers).

## Pairing With Other Tools

- `edf-validate` — single-file CLI validator. Use it interactively after the
  audit reports an error, to iterate on one file.
- `edf-doc-reviewer` agent — qualitative narrative review of one document
  (clarity, completeness, voice). Run after structural audit passes.
- `edf-validation-rules` — the rules this skill enforces. Cite specific
  rule names in findings when possible.

## Anti-Patterns to Avoid

- Don't try to autofix `error` findings without confirmation — broken
  references and missing required fields often signal a deeper rename or
  deletion that needs human judgment.
- Don't run the audit against arbitrary directories (`~/`, `/`). Always
  bind to a known plugin or marketplace root.
- Don't report aggregated counts only. The per-file breakdown is the
  artifact the user acts on.
- Don't suppress warnings to make the report look cleaner. The whole
  point is surfacing them.
