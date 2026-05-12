# austdx-cc-mkpl

Austin's Claude Code plugin marketplace — opinionated DX plugins for agentic coding workflows.

## What's inside

| Plugin | Purpose |
|--------|---------|
| [`modern-unix-tools`](./plugins/modern-unix-tools) | Teaches Claude to prefer modern Rust/Go/C++ CLI replacements (ripgrep, fd, sd, bat, eza, zoxide, dust, hyperfine, delta, tokei, grex, tealdeer, watchexec, just, jq, yq) over classic Unix tools (grep, find, sed, cat, ls, cd, du, time, wc). Includes syntax divergence cheatsheets, exit-code gotchas, and anti-patterns. |
| [`kbac`](./plugins/kbac) | Knowledge graph development toolkit for the kbac Neo4j knowledge base. Bundles five skills (cypher-authoring, typebox-schema, graph-query-design, repo-setup, cli-toolchain), two review agents (cypher-reviewer, schema-sync-checker), and a SessionStart hook that injects current node/relationship schemas, seed files, and query templates into context. |
| [`edf`](./plugins/edf) | Enhanced Document Format toolkit — companion plugin to the [`@austyle-io/edf`](https://github.com/austyle-io/edf) TypeScript library. Bundles five agents (`edf-author`, `edf-doc-reviewer`, `edf-layer-advisor`, `runbook-executor`, `runbook-strategist`) and 19 skills covering EDF authoring, validation, layer-budget analysis, runbook orchestration, decision-tree / workflow patterns, and EDF-specific Neo4j Cypher patterns. |

More plugins to come.

## Use it

Add this marketplace to Claude Code:

```bash
/plugin marketplace add austyle-io/austdx-cc-mkpl
```

Then install any plugin:

```bash
/plugin install modern-unix-tools@austdx-cc-mkpl
```

To update after the marketplace publishes new versions:

```bash
/plugin marketplace update austdx-cc-mkpl
```

## Repository layout

```
austdx-cc-mkpl/
├── .claude-plugin/
│   └── marketplace.json       # Marketplace catalog
├── plugins/
│   └── modern-unix-tools/
│       ├── .claude-plugin/
│       │   └── plugin.json    # Plugin manifest
│       ├── skills/
│       │   └── modern-unix-tools/
│       │       └── SKILL.md   # The skill itself
│       └── README.md
├── LICENSE
└── README.md
```

## Contributing

This marketplace is personal infrastructure, but PRs adding new plugins or improving existing ones are welcome. Follow the [Claude Code plugin specification](https://code.claude.com/docs/en/plugins) for any new additions, and run `plugin-validator` before opening a PR.

## License

MIT — see [LICENSE](./LICENSE).
