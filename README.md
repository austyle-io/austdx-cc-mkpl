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
session, and the `claude plugin` subcommand from your terminal. Both surfaces
expose the full marketplace + plugin lifecycle.

The marketplace **name** is the `name` field in
`.claude-plugin/marketplace.json` (`austdx-cc-mkpl`), not the GitHub repo
slug. The repo slug (`austyle-io/austdx-cc-mkpl`) is what you give to
`marketplace add`; everything afterward references the marketplace by name.

### Inside Claude Code (slash commands)

```bash
# Marketplace
/plugin marketplace add austyle-io/austdx-cc-mkpl
/plugin marketplace list
/plugin marketplace update austdx-cc-mkpl    # refresh catalog
/plugin marketplace remove austdx-cc-mkpl

# Plugins
/plugin install   edf@austdx-cc-mkpl
/plugin update    edf@austdx-cc-mkpl
/plugin uninstall edf@austdx-cc-mkpl

# Interactive menu (browse, enable/disable, etc.)
/plugin
```

After installing or enabling a plugin in-session, run `/reload-plugins` so the
new commands, agents, and skills register without a session restart.

### From the terminal (`claude plugin` CLI)

`claude plugin` (alias `claude plugins`) covers the same ground:

```bash
# Marketplace (accepts URL, local path, or GitHub owner/repo)
claude plugin marketplace add austyle-io/austdx-cc-mkpl
claude plugin marketplace list
claude plugin marketplace update                 # update all marketplaces
claude plugin marketplace update austdx-cc-mkpl  # or one by name
claude plugin marketplace remove austdx-cc-mkpl  # alias: rm

# Plugins
claude plugin install   edf@austdx-cc-mkpl       # alias: i
claude plugin list                               # add --available for catalog
claude plugin update    edf@austdx-cc-mkpl       # restart required to apply
claude plugin uninstall edf@austdx-cc-mkpl       # alias: remove
claude plugin enable    edf@austdx-cc-mkpl
claude plugin disable   edf@austdx-cc-mkpl
claude plugin prune                              # alias: autoremove

# Manifest validation + release tagging (useful for plugin authors)
claude plugin validate ./plugins/edf
claude plugin tag      ./plugins/edf             # creates edf--v0.1.0 tag
```

`claude plugin validate <path>` is the canonical pre-PR check for both plugin
and marketplace manifests; run it before opening a PR against this repo.

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

This marketplace is personal infrastructure, but PRs adding new plugins or
improving existing ones are welcome. Follow the [Claude Code plugin
specification](https://code.claude.com/docs/en/plugins) for any new additions.

Before opening a PR, validate every manifest you touched:

```bash
# Marketplace manifest
claude plugin validate ./.claude-plugin/marketplace.json

# Each affected plugin
claude plugin validate ./plugins/<name>
```

All four must return `✔ Validation passed`.

## License

MIT — see [LICENSE](./LICENSE).
