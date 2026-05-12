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

Two surfaces are available: the slash commands inside an active Claude Code
session, and the `claude plugin` subcommand from your terminal. Marketplace
add/list/update/remove are slash-only; plugin install/update/uninstall/list
work from both.

### Inside Claude Code (slash commands)

```bash
# Add this marketplace
/plugin marketplace add austyle-io/austdx-cc-mkpl

# Install a plugin
/plugin install edf@austdx-cc-mkpl

# Update an installed plugin
/plugin update edf@austdx-cc-mkpl

# Refresh the marketplace catalog
/plugin marketplace update austdx-cc-mkpl

# Uninstall
/plugin uninstall edf@austdx-cc-mkpl

# Browse / manage everything via the menu
/plugin
```

After installing or enabling a plugin in-session, run `/reload-plugins` so the
new commands, agents, and skills register without a session restart.

### From the terminal (`claude plugin` CLI)

```bash
# Install a plugin (use --scope user|project|local; default is user)
claude plugin install edf@austdx-cc-mkpl

# List installed plugins (--available --json includes marketplace catalog)
claude plugin list

# Update an installed plugin
claude plugin update edf@austdx-cc-mkpl

# Uninstall (--prune drops orphaned dependencies)
claude plugin uninstall edf@austdx-cc-mkpl
```

Marketplace add/list/update/remove are not exposed as `claude` CLI subcommands
— do those from the slash surface above. Marketplace name is the `name` field
in `.claude-plugin/marketplace.json` (`austdx-cc-mkpl`), not the GitHub repo
slug.

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
