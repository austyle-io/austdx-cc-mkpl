---
name: kbac
description: Use when searching the kbac knowledge graph by fulltext term — typically with optional filters for node type (Tool, Concept, Domain, System) and a result limit.
argument-hint: "<term> [--type Tool|Concept|Domain|System] [--limit 1-100]"
allowed-tools: Bash
---

# /kbac — Search the kbac knowledge graph

Run a fulltext search over the kbac graph using the `kbac` CLI on `$PATH`.

## Arguments

The user-provided arguments are: `$ARGUMENTS`

Parse them as a quoted search term followed by optional flags:
- `--type <NodeLabel>` where NodeLabel is one of `Tool`, `Concept`, `Domain`, `System`
- `--limit <n>` where n is an integer between 1 and 100 (default 10)

## Execution

1. Invoke the CLI via the Bash tool, **always** passing `--json` so you receive a machine-readable response.

   The exact command form is:

   ```text
   kbac search "<term>" [--type <label>] [--limit <n>] --json
   ```

   Quote the term to preserve spaces and special characters. Do not shell-escape inside the term — `kbac search` does its own Lucene escaping internally.

2. Inspect the exit code and stdout:
   - **Exit 0 + JSON with `term`, `results`, `totalCount`:** success. Render top results as Markdown (see Output Format).
   - **Exit 2 + JSON `{"error":"invalid_input", ...}`:** the user's flags were rejected. Show the message verbatim and remind them of valid flag values (`--type` must be Tool|Concept|Domain|System; `--limit` 1-100).
   - **Exit 3 + JSON `{"error":"neo4j_unreachable" | "neo4j_timeout", ...}`:** the Neo4j container is down. Tell the user to run `docker ps` and `yarn -C ~/Github/kbac db:up`.
   - **Exit 4 + JSON `{"error":"schema_mismatch", ...}`:** the graph has drifted from the TypeBox schemas. Suggest running the `kbac-schema-sync-checker` agent.
   - **Exit 127 + stderr containing "command not found":** the `kbac` binary is not on PATH. Tell the user to run `/kbac:kbac-init` first.
   - **Anything else:** report the error verbatim.

## Output format

For successful results, render Markdown with:

- A header line showing the search term and total result count.
- A numbered list, one entry per result, formatted as:
  `N. **<Label>** \`<name>\` _(score: <score>)_` followed by the description if present.
- A footer line noting the query duration (`durationMs` field).

Limit the rendered list to the first 10 results regardless of `--limit`; if more exist, append a "(and N more)" note.

## Examples

User: `/kbac neo4j`
You run: `kbac search "neo4j" --json`

User: `/kbac "schema validation" --type Concept --limit 5`
You run: `kbac search "schema validation" --type Concept --limit 5 --json`

User: `/kbac` (no arguments)
Respond: "Usage: /kbac <term> [--type <label>] [--limit <n>]". Do not invoke the CLI.
