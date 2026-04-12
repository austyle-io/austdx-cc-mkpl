---
name: edf-stats
description: >
  Use when reporting statistics about EDF documents — token counts per
  4-layer disclosure level, total tokens, doc counts by type (agent/skill/
  command/runbook/decision-tree), frontmatter completeness rates, and
  reference-graph stats. Surfaces outsized docs that may need refactoring.
  Runs the @austyle-io/edf library's parser CLI (`tsx src/parser/cli.ts
  stats`) and reports the result.
  For compliance findings reports (broken refs, layer issues,
  forbidden fields), use `plugin-edf-audit` — this skill is for
  quantitative metrics only (counts, tokens, percentages).
---

# EDF Stats

Generate an audit report over a tree of EDF documents. Output is a JSON
summary covering token budgets per disclosure layer, document counts by
type, frontmatter completeness, and reference-graph density. Use this to
spot outsized documents that should be split or refactored, and to
verify that a refactor actually moved tokens off the cheap layers.

This skill **runs the parser CLI** — it does not reimplement statistics
logic in this session. Source of truth: `@austyle-io/edf`'s
`src/parser/cli.ts stats` subcommand.

## When to use this skill

- Auditing a plugin's token budget before shipping
- Identifying outsized skills/agents that exceed Layer 1 caps (~500 tok)
- Verifying a refactor actually moved tokens off cheap layers
- Comparing two directories' EDF compliance side by side
- Producing input for the `edf-layer-advisor` agent's recommendations

## Invocation

The parser is consumed via JIT execution against the local
`@austyle-io/edf` checkout. From any repo with `tsx` on path:

```bash
# Whole tree (current directory)
pnpm dlx tsx /path/to/austyle-io/edf/src/parser/cli.ts stats

# Scoped to a subdirectory
pnpm dlx tsx /path/to/austyle-io/edf/src/parser/cli.ts stats ./skills
pnpm dlx tsx /path/to/austyle-io/edf/src/parser/cli.ts stats ./agents
pnpm dlx tsx /path/to/austyle-io/edf/src/parser/cli.ts stats ./plugins/edf
```

The `@austyle-io/edf` package does not currently expose a `bin` entry
for the parser CLI; invoke it via the source path above. If a future
release adds a `bin: { "edf-parser": "..." }` entry, prefer the binary
form (`yarn edf-parser stats [path]` from the consumer repo).

Default scope is `.` (current working directory) when no path argument
is supplied. The CLI walks the tree, skipping `node_modules` and
`.git`, and analyzes every file with EDF-shaped frontmatter.

## Output shape

`stats` emits a single JSON object to stdout. Schema (abridged):

| Field                        | Type                | Meaning                                           |
| ---------------------------- | ------------------- | ------------------------------------------------- |
| `documentsAnalyzed`          | number              | Count of EDF documents discovered                 |
| `totalTokens`                | number              | Sum of token estimates across all documents       |
| `avgTokensPerDoc`            | number              | `totalTokens / documentsAnalyzed`, rounded        |
| `documentsWithLayers`        | number              | Docs that mark explicit `<!-- @layer:N -->` boundaries |
| `documentsWithXmlTags`       | number              | Docs that use semantic XML tags                   |
| `documentsWithDecisionTrees` | number              | Docs containing decision-tree embeds              |
| `tokensByLayer`              | `Record<1-4,number>`| Token totals partitioned by disclosure layer      |

Pipe the output to `jq` to filter, sort, or roll up:

```bash
pnpm dlx tsx /path/to/austyle-io/edf/src/parser/cli.ts stats ./skills \
  | jq '{total: .totalTokens, avg: .avgTokensPerDoc, byLayer: .tokensByLayer}'
```

## Reading the numbers

The point of `stats` is not the totals — it's the **shape** of the
distribution. Healthy EDF trees show a steep Layer 1 → Layer 4 token
gradient. Anti-patterns to flag in the report:

- **Top-heavy.** `tokensByLayer[1]` > `tokensByLayer[2]`. Identity
  content is bloated; users pay the full cost on every discovery.
- **No fan-out.** `tokensByLayer[3]` and `[4]` both near zero. Either
  the skills are trivial, or they're shipping examples and recovery
  paths on Layer 1 (top-heavy in disguise).
- **Low XML / decision-tree adoption.** `documentsWithXmlTags` ≪
  `documentsAnalyzed`. Indicates legacy markdown that hasn't been
  migrated to semantic tags yet.
- **Outsized average.** `avgTokensPerDoc` > ~3000 in a skills tree
  suggests several documents are doing too much; split candidates.

## Typical follow-ups after running stats

1. Identify the worst offenders. Re-run with a narrower path
   (`stats ./skills/<suspect>`) to confirm which file dominates the
   total.
2. Inspect layer composition for that file with the sibling subcommand:

   ```bash
   pnpm dlx tsx /path/to/austyle-io/edf/src/parser/cli.ts layers \
     ./skills/<suspect>/SKILL.md
   ```

3. If Layer 1 is over budget, the `edf-layer-advisor` agent can
   recommend which sections to push down. If the document is doing
   multiple unrelated jobs, the `edf-authoring` skill describes how to
   split it.
4. Re-run `stats` after the refactor and diff the two reports — the
   intended improvement should show up as Layer 1 token reduction
   without Layer 4 ballooning out of bounds.

## Operating tips

- **Always pin the path.** Running `stats` at a repo root mixes
  skills, agents, runbooks, and docs into one number. Scope to a single
  artifact type (`./skills`, `./agents`, …) for actionable numbers.
- **Diff, don't admire.** A single `stats` run is a snapshot. The
  signal is in the delta between runs — capture output to a file
  before a refactor and compare after.
- **Trust the parser, not the eyeball.** Token estimates use the
  parser's tokenizer (heuristic but consistent). Hand-counting words
  is not equivalent. If a number looks wrong, suspect malformed
  frontmatter before suspecting the CLI.
- **Skip noise paths.** If a target tree includes generated fixtures
  or vendored EDF samples, scope the command tighter rather than
  trying to filter the JSON output.

## Failure modes

| Symptom                              | Likely cause                                      | Action                                            |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| `documentsAnalyzed: 0`               | Path has no EDF-shaped frontmatter                | Verify path; check that files start with `---`    |
| `tokensByLayer` keys all empty       | Docs lack `<layer>` markers                       | These docs are pre-EDF; run `edf-authoring` first |
| CLI errors out on a single file      | Malformed YAML frontmatter                        | Run `edf-validate` to locate the offender         |
| Numbers look implausibly large       | Stats includes `node_modules` or generated trees  | Scope the path; the CLI does not auto-skip dist   |

## References

- `../edf-authoring/SKILL.md` — how to structure documents into
  the 4-layer model that `stats` measures against
- `../edf-validation-rules/SKILL.md` — the compliance rules that
  define what counts as an EDF document for `stats`
- `../../agents/edf-layer-advisor.md` — consumes `stats` output to
  recommend refactors
- `https://github.com/austyle-io/edf` — parser source of truth
