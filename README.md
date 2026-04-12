# austdx-cc-mkpl

Austin's Claude Code plugin marketplace — opinionated DX plugins for agentic coding workflows.

## What's inside

| Plugin | Purpose |
|--------|---------|
| [`modern-unix-tools`](./plugins/modern-unix-tools) | Teaches Claude to prefer modern Rust/Go/C++ CLI replacements (ripgrep, fd, sd, bat, eza, zoxide, dust, hyperfine, delta, tokei, grex, tealdeer, watchexec, just, jq, yq) over classic Unix tools (grep, find, sed, cat, ls, cd, du, time, wc). Includes syntax divergence cheatsheets, exit-code gotchas, and anti-patterns. |

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
