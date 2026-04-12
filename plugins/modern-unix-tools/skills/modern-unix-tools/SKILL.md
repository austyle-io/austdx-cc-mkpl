---
name: modern-unix-tools
description: Use when the user's environment has modern Rust/Go/C++ replacements for classic Unix tools (ripgrep, fd, sd, bat, eza, zoxide, fzf, delta, hyperfine, tokei, dust, duf, procs, btop, watchexec, tealdeer, grex, just, jq, yq) and you're about to reach for grep/find/sed/cat/ls/cd/du/df/ps/top — prefer the modern tool if available. Covers syntax divergences, gotcha flags, when the classic tool is still the right call, and command-by-command mappings.
---

# Modern Unix Tools — Classic → Rust/Go/C++ Replacements

## When this skill applies

Before running `grep`, `find`, `sed`, `cat`, `ls`, `cd`, `du`, `df`, `ps`, `top`, `time` (benchmarking), or `wc -l` (on source code), check whether the modern replacement is installed. In this user's environment (devcontainer + dotfiles), most are. The modern tool is usually faster, has better defaults for codebases (e.g., respects `.gitignore`), and produces more readable output.

## Detection pattern

**In interactive Claude Code sessions:** prefer the modern tool directly and fall back if it errors — the cost of one failed command is lower than a `command -v` check on every call.

**In scripts that will be committed or distributed:** always guard. A script that assumes `rg` fails opaquely on a plain-POSIX system:

```bash
if command -v rg >/dev/null 2>&1; then
    rg "pattern" .
else
    grep -r "pattern" .
fi
```

## The complete mapping

| Classic | Modern replacement | Language | Notes |
|---------|-------------------|----------|-------|
| `grep -r` | **`rg`** (ripgrep) | Rust | `.gitignore`-aware by default. Much faster. |
| `find` | **`fd`** | Rust | Regex by default. Intuitive flags. |
| `sed` | **`sd`** | Rust | Simpler find-replace. No `s///g` ceremony. |
| `cat` (for viewing code) | **`bat`** | Rust | Syntax highlighting, line numbers, paging. |
| `cat` (for piping) | keep `cat` | — | `bat` adds UI chrome unwanted in pipes. |
| `ls` | **`eza`** | Rust | Git-aware, tree mode, icons, colors. |
| `cd` (with history) | **`z`** (zoxide) | Rust | Fuzzy-matches frecency-ranked dir history. |
| `du` | **`dust`** | Rust | Tree-style output sorted by size, no flags needed. |
| `du -sh *` | **`dust`** or **`duf`** | Rust | `duf` for mounted-filesystem overview. |
| `df -h` | **`duf`** | Go | Per-mount view, sorted, themed. |
| `ps aux` | **`procs`** | Rust | Tree mode, colors, per-column search. |
| `top` / `htop` | **`btop`** | C++ | Mouse support, graphs, network, GPU. |
| `diff` (git context) | **`delta`** (git-delta) | Rust | Syntax-highlighted git diff pager. |
| `diff` (general) | **`difftastic`** | Rust | Syntax-aware structural diff. |
| `time cmd` (benchmark) | **`hyperfine`** | Rust | Statistically rigorous benchmarking. |
| `wc -l` (on source) | **`tokei`** | Rust | Per-language LOC, comments, blanks. |
| `fzf` / `--preview` | **`fzf`** | Go | Already the modern option — use liberally. |
| fs-watch + re-run | **`watchexec`** | Rust | Rerun command on file change. |
| `tldr` (Node) | **`tldr`** (tealdeer) | Rust | Same command, faster runtime. |
| `make` (task runner) | **`just`** | Rust | Simpler, Makefile-adjacent syntax. |
| regex crafting | **`grex`** | Rust | Generates regex from example strings. |
| JSON processing | **`jq`** | C | Already modern; pairs well with everything. |
| YAML processing | **`yq`** (Mike Farah) | Go | jq-like for YAML. |
| HTML processing | **`htmlq`** | Rust | jq-like for HTML. |

## Prefer modern, but keep classics when

- **In portable scripts distributed beyond this machine.** POSIX tools are everywhere; `rg` isn't.
- **In pipes where the modern tool adds chrome.** `bat` in a pipe auto-disables paging but still risks extra formatting — use `bat --plain` or just `cat`.
- **When the classic flag set is load-bearing.** `find -printf '%T@ %p\n'` has no direct `fd` equivalent; fall back to `find`.
- **When `.gitignore` filtering is wrong for the task.** `rg` hides build artifacts by default. Use `rg -uu` to include ignored files, or `grep -r` to bypass entirely.
- **Perf measurements for tiny commands.** `hyperfine` has ~10ms overhead vs bare `time`; for sub-millisecond commands, use the classic.

## Syntax divergences that will trip you up

### `sd` vs `sed`

`sd` replaces `sed`'s find/replace (the 80% use case). It does NOT replace `sed`'s stream-editing DSL (`p`, `d`, `a`, `i`, hold-space, line addresses).

| Task | sed | sd |
|------|-----|-----|
| Replace all in stream | `sed 's/old/new/g'` | `sd 'old' 'new'` |
| Replace in file in place | `sed -i 's/old/new/g' file` | `sd 'old' 'new' file` |
| Preview without writing | n/a | `sd -p 'old' 'new' file` |
| Backreference | `sed -E 's/(\w+)/[\1]/g'` | `sd '(\w+)' '[$1]'` (`$1`, not `\1`) |
| Literal match (no regex) | `sed 's/.*/.../g'` awkward | `sd -F '.' '_'` |
| Multiline (span newlines) | `sed ':a;N;$!ba;s/\n/,/g'` | `sd -A '\n' ','` |
| Delete line matching | `sed '/foo/d' file` | **use sed** (no direct equivalent) |
| Append line | `sed '/foo/a\bar' file` | **use sed** |

**Rule:** if the task is "find this, replace with that" — use `sd`. Anything else, `sed`.

### `fd` vs `find`

| Task | find | fd |
|------|------|-----|
| By name substring | `find . -iname '*foo*'` | `fd foo` |
| By extension | `find . -name '*.md'` | `fd -e md` |
| By type (file) | `find . -type f` | `fd -t f` |
| By type (directory) | `find . -type d` | `fd -t d` |
| Exec on each result | `find . -name '*.zip' -exec unzip {} \;` | `fd -e zip -x unzip` |
| Exec in batch (xargs) | `find . -name '*.py' -print0 \| xargs -0 vim` | `fd -e py -X vim` |
| Include hidden | `find . -name '.*'` | `fd --hidden` |
| Ignore .gitignore | (find ignores nothing) | `fd --no-ignore` |
| Glob instead of regex | `find . -name 'test_*'` | `fd -g 'test_*'` |
| NUL-delimited output (safe for xargs) | `find . -print0` | `fd -0` |

**Gotcha:** `fd foo` matches anywhere in the path — roughly `find . -iregex '.*foo.*'`. Use `fd -F 'exact'` for literal whole-name match, or `fd '^exact$'` with regex anchors.

**Gotcha:** `fd` skips hidden and `.gitignore`d files by default. Scripts that *need* those must pass `--hidden --no-ignore` (or `-HI`).

**Gotcha:** `fd` exits `0` whether or not it matched anything — unlike `grep`/`rg` which exit `1` on no match. Don't gate scripts on `fd`'s exit code; check `[ -n "$(fd pattern)" ]` or count output lines instead.

### `rg` vs `grep -r`

| Task | grep -r | rg |
|------|---------|-----|
| Basic search | `grep -r 'pat' .` | `rg 'pat'` |
| Case-insensitive | `grep -ri 'pat'` | `rg -i 'pat'` |
| Fixed string (no regex) | `grep -rF 'a.b'` | `rg -F 'a.b'` |
| Only certain extensions | `grep -r --include='*.py' 'pat'` | `rg -tpy 'pat'` or `rg -g '*.py' 'pat'` |
| Exclude certain extensions | `grep -r --exclude='*.min.js'` | `rg -Tjs` or `rg -g '!*.min.js'` |
| List files with matches | `grep -rl 'pat'` | `rg -l 'pat'` |
| List files without match | `grep -rL 'pat'` | `rg --files-without-match 'pat'` |
| Context lines | `grep -rC3 'pat'` | `rg -C3 'pat'` |
| Multiline pattern | clumsy | `rg -U '(?s)pat.*pat'` |
| PCRE2 (lookaround etc.) | `grep -rP 'pat'` | `rg -P 'pat'` |
| Include `.gitignore`d | (grep ignores nothing) | `rg --no-ignore` or `-u` |
| Include hidden | (grep ignores nothing) | `rg --hidden` or `-uu` |
| Search binaries too | (grep tries by default) | `rg --text` or `-uuu` |
| Replace in output | n/a | `rg 'foo' -r 'bar'` (preview only; doesn't write) |
| List available file types | n/a | `rg --type-list` |
| NUL-delimited output (safe for xargs) | `grep -rZ 'pat'` | `rg --null 'pat'` or `rg -0 'pat'` |

**Gotcha:** `rg`'s `.gitignore` respect means a search in `node_modules/` returns nothing by default. This is a feature — but when you *need* to search it, remember `-uu` or add `!node_modules/**` to a local `.ignore`.

**Gotcha:** literal-brace patterns in Go/Rust (`interface{}`, `struct{}`) need escaping in `rg`: `rg 'interface\{\}'` (shell quotes prevent shell-glob expansion; the backslashes escape ripgrep's regex).

### `dust` vs `du`

`dust` defaults are what you usually wanted from `du`:
- Sorted largest-first.
- Tree-style output.
- Human-readable sizes.

| Task | du | dust |
|------|-----|------|
| Summary of current dir | `du -sh *` | `dust` |
| Limit depth | `du -sh --max-depth=3` | `dust -d 3` |
| Top 30 largest | `du -ah \| sort -rh \| head -30` | `dust -n 30` |
| Only same filesystem | `du -x` | `dust -x` |
| Full paths | `du -a` | `dust -p` |
| Machine-readable | `du -b` | **use du** |

**Rule:** for human inspection, `dust`. For scripting that consumes byte counts, `du`.

### `bat` vs `cat`

`bat` is a better `cat` for **viewing**, a poor replacement for **piping**.

| Task | cat | bat |
|------|-----|-----|
| View a file | `cat file.py` | `bat file.py` |
| Pipe content into command | `cat file \| other` | `bat --plain file \| other` (or just `cat`) |
| No paging | (none) | `bat --paging=never` |
| Specific language | n/a | `bat -l python file.txt` |
| Show all characters | `cat -A` | `bat -A` |

**Gotcha:** `bat` auto-detects TTY and disables color/paging in pipes, but some commands read stdin with expectations that break on bat's leading whitespace. Use `bat --plain` (or `bat -pp`) or stay with `cat` in pipes.

### `eza` vs `ls`

`eza` is strictly a superset for interactive use. Don't parse its output in scripts (same as `ls` — parsing either is fragile).

| Task | ls | eza |
|------|-----|-----|
| Long listing | `ls -la` | `eza -la` |
| Tree view | `ls -R` (ugly) | `eza --tree` or `eza -T` |
| Git status column | n/a | `eza -l --git` |
| Icons (Nerd Font required) | n/a | `eza --icons` |
| Size human-readable | `ls -lh` | `eza -lh` (default is human) |
| Sort by modified | `ls -lt` | `eza -l --sort=modified` |

### `zoxide` vs `cd`

`z` learns your directory habits. After a few `cd`s, you can jump by substring.

| Task | cd | z |
|------|-----|-----|
| Go to exact path | `cd /long/path/to/project` | `cd` (zoxide intercepts but full paths still work) |
| Jump by last-used fragment | n/a | `z proj` (jumps to /long/path/to/project) |
| Interactive pick | n/a | `zi` |

**Gotcha:** `z` only knows dirs you've visited. A fresh clone won't be jumpable until you `cd` there once.

### `hyperfine` vs `time`

For benchmarking, never use `time` (unreliable, no stats, one sample). Use `hyperfine`:

```bash
# Quick comparison — runs both 10 times, produces stats
hyperfine 'rg pattern .' 'grep -r pattern .'

# Warmup (for commands that hit cold caches)
hyperfine --warmup 3 'just test-unit'

# Export for further analysis
hyperfine --export-json results.json 'cmd'
```

### `delta` (auto-used via git config)

If configured as the pager in `~/.gitconfig`, `git diff` / `git show` / `git log -p` render through delta automatically. Verify with:
```bash
git config --get-all core.pager
git config --get-all interactive.diffFilter
```
If these show `delta`, you're already benefiting. No call-site change needed.

## Anti-patterns

- **Blindly aliasing `grep=rg`.** Breaks scripts that depend on `grep`'s POSIX behavior (exit codes, output format). Keep classic names unaliased; invoke modern tools by their actual names.
- **Using `bat` in pipelines.** Adds line numbers and ANSI unless you pass `--plain`. Just use `cat`.
- **Using `rg` when you need to grep a `.gitignore`d file.** Add `-uu` or fall back to `grep`.
- **Using `dust` to get machine-readable sizes.** Use `du -b` or `du -B1`.
- **Using `sd` for stream editing.** `sd` is find-and-replace only — for line deletion, insertion, or hold-space work, use `sed` or `awk`.
- **Benchmarking with bash `time`.** Use `hyperfine`.
- **Running `find ... -exec` when you want parallelism.** Use `fd -x` (parallel) or `fd -X` (batch).

## Upstream references

For deeper dives into any specific tool:

- **sd:** `https://github.com/chmln/sd` — README covers every option.
- **fd:** `https://github.com/sharkdp/fd` — README + man page.
- **ripgrep:** `https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md` — detailed user guide.
- **eza:** `https://github.com/eza-community/eza` — man pages cover every flag.
- **bat:** `https://github.com/sharkdp/bat` — theme + language customization.
- **dust:** `https://github.com/bootandy/dust` — small README, covers everything.
- **hyperfine:** `https://github.com/sharkdp/hyperfine` — stats theory + export formats.
- **delta:** `https://dandavison.github.io/delta/` — all rendering options.
- **just:** `https://just.systems` — full language reference.

## Quick-reference: in one line

> "If I'm reaching for `grep`/`find`/`sed`/`du` and I'm on a Rust-tooling machine, use `rg`/`fd`/`sd`/`dust` instead — but the classics remain the right call in portable scripts, POSIX pipelines, and stream-editing beyond find-replace."
