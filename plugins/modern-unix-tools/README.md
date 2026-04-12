# modern-unix-tools

A Claude Code skill plugin that teaches the agent to prefer modern Rust/Go/C++ CLI replacements (ripgrep, fd, sd, bat, eza, zoxide, dust, hyperfine, delta, tokei, grex, tealdeer, watchexec, just, jq, yq) over classic Unix tools (grep, find, sed, cat, ls, cd, du, time, wc) — with syntax divergence cheatsheets, exit-code gotchas, and anti-pattern warnings.

## What it does

When Claude is about to run a classic Unix tool (`grep`, `find`, `sed`, `cat`, `ls`, `du`, etc.), this skill fires and suggests the modern replacement if it's installed on the user's system. The skill covers:

- **Full mapping** of 21 classic → modern tool pairs
- **Syntax divergence tables** for the 8 highest-friction pairs (`sd` vs `sed`, `fd` vs `find`, `rg` vs `grep`, `dust` vs `du`, `bat` vs `cat`, `eza` vs `ls`, `zoxide` vs `cd`, `hyperfine` vs `time`)
- **Exit-code gotchas** (`fd` returns 0 regardless of match, unlike `rg`/`grep`)
- **`.gitignore`-awareness caveats** (`rg` silently skips ignored files — feature, not bug, but sometimes wrong)
- **Pipe hygiene** (when `bat` adds unwanted chrome, when to fall back to `cat`)
- **Portability guidance** (keep classics in scripts distributed beyond a known environment)
- **Anti-patterns** (don't blindly alias `grep=rg`, don't use `sd` for stream editing, don't benchmark with bash `time`)

## Install

From this marketplace:

```bash
/plugin marketplace add austyle-io/austdx-cc-mkpl
/plugin install modern-unix-tools@austdx-cc-mkpl
```

Local development / iteration:

```bash
claude --plugin-dir ./plugins/modern-unix-tools
```

## When the skill fires

The skill's description lists explicit trigger tokens (`grep`, `-r`, `find`, `sed`, `cat`, `ls`, `cd`, `du`, `df`, `ps`, `top`, `time`, `wc -l`). Claude will invoke the skill automatically when any of these appear in a planned command.

## License

MIT
