# austdx-cc-mkpl — Project Rules

## Plugin conventions

- Every plugin lives under `plugins/<name>/` with a `.claude-plugin/plugin.json` manifest.
- Skills go in `skills/<skill-name>/SKILL.md`; agents in `agents/<name>.md`; hooks in `hooks/`.
- Skill descriptions must clearly state trigger conditions (when to use).
- Agent descriptions must include example interactions with `<commentary>` blocks.

## TypeScript in plugins

- Import TypeBox as `typebox` (v1+), never `@sinclair/typebox`.
- When using AJV with TypeBox schemas, pass `{ strict: false }` to the Ajv constructor to tolerate TypeBox `Kind` symbols.
- Hook scripts that import npm packages must either bundle deps or declare them in a local `package.json`.

## Content deduplication

- Avoid duplicating guidance already covered by another plugin in this repo. Reference the existing plugin instead.
- The `modern-unix-tools` plugin is the canonical source for generic CLI tool tables and fallback patterns. Domain-specific plugins should only include domain-specific examples.

## Auth boundary marking

- Any command or script requiring interactive credentials (Touch ID, password prompt, browser-based OAuth) must be clearly marked `[auth]` in skills and agents.
- Commands Claude can run directly are marked `[auto]`.

## kbac plugin — known constraints

- The SessionStart hook (`kbac-session-context.ts`) declares its own dependencies in `hooks/package.json` and is pinned to `yarn@3.7.0` via `packageManager`. After cloning, run `yarn install` inside `plugins/kbac/hooks/` to materialize `typebox`, `ajv`, and `tsx`. The hooks dir uses `nodeLinker: node-modules` (not PnP), matching the `~/Github/kbac` repo, so plain `tsx` invocation works without a PnP loader.
- The `hooks.json` matcher `"startup|clear|compact"` must be validated against the Claude Code hook spec to confirm regex matchers are supported.

## edf plugin — conventions

- The plugin is a companion to the [`@austyle-io/edf`](https://github.com/austyle-io/edf) TypeScript library. Validation runs from that repo: `cd /path/to/austyle-io/edf && pnpm exec tsx src/validator/cli.ts /path/to/this/plugin` (the `@` is the npm package scope, not part of the on-disk path).
- The shipping validator only emits error codes `EDF001` (reference target not found), `EDF002` (circular reference), `EDF003` (version constraint), `EDF004` (invalid reference format), `EDF005` (Neo4j target not in graph), plus free-form `W*` warnings. Treat additional codes (e.g. `E-FM-NNN`, `E-LAY-NNN`) as hallucinations.
- The CLI is a checker only — there is no `--fix` flag. Apply fixes by editing the document directly and re-running the validator.
- Layer markers use the canonical `<!-- @layer:N -->` HTML-comment form (`load="on-demand"` on layer 3, `load="on-failure"` on layer 4). The legacy `<!-- Layer N: Name -->` form is removed. **Skills under 200 total lines may omit layer markers entirely** (per `skills/edf-validation-rules` Layer compliance). For longer skills and all agents, Layer 1 is mandatory; 2–4 are optional but, if present, must appear in order with no gaps.
- Forbidden component-doc frontmatter fields: `edf:`, `version:`, `related:`. The forbidden-fields rule applies to the four EDF component types (`agent`, `skill`, `command`, `hook`); runbooks are runtime artifacts with their own frontmatter shape (see `skills/edf-validation-rules` Runbook-frontmatter section) and may carry `version:` and `type: runbook`.
- Agent `tools:` arrays must include every tool the agent body references. In particular, an agent that delegates to sub-agents needs `Agent` (the renamed-in-2.1.63 successor to `Task`) declared explicitly — `BashOutput` is implicit when `Bash` is declared.
- For canonical guidance see the plugin's own skills: `edf-validation-rules` (rules), `edf-authoring` (write), `edf-validate` (run validator), `plugin-edf-audit` (bulk compliance scan), `edf-stats` (quantitative metrics). For narrative review, dispatch the `edf-doc-reviewer` agent.

## Claude Code plugin & marketplace command reference

Both the in-session slash surface (`/plugin ...`) and the terminal CLI
(`claude plugin ...`, alias `claude plugins ...`) expose the full lifecycle.
Pick whichever fits the moment; the semantics match. Verify any uncertainty
with `claude plugin --help` and `claude plugin marketplace --help` — those
are the canonical sources, not memory or external docs.

The marketplace **name** is the `.name` field in
`.claude-plugin/marketplace.json` (`austdx-cc-mkpl` for this repo), not the
GitHub repo slug. The repo slug (`austyle-io/austdx-cc-mkpl`) is only used
for the initial `marketplace add`; everything afterward references the
marketplace by its registered name.

### Marketplace lifecycle

| Operation | Slash | Terminal CLI |
|-----------|-------|--------------|
| Add (URL, path, or `owner/repo`) | `/plugin marketplace add <source>` | `claude plugin marketplace add <source>` |
| List configured marketplaces | `/plugin marketplace list` | `claude plugin marketplace list` |
| Refresh catalog from source | `/plugin marketplace update [name]` | `claude plugin marketplace update [name]` |
| Remove (alias: `rm`) | `/plugin marketplace remove <name>` | `claude plugin marketplace remove <name>` |

### Plugin lifecycle

| Operation | Slash | Terminal CLI |
|-----------|-------|--------------|
| Install (alias: `i`) | `/plugin install <name>@<marketplace>` | `claude plugin install <name>@<marketplace>` |
| List installed (`--available` for catalog) | `/plugin` (interactive) | `claude plugin list` |
| Update (restart required to apply) | `/plugin update <name>@<marketplace>` | `claude plugin update <name>@<marketplace>` |
| Uninstall (alias: `remove`) | `/plugin uninstall <name>@<marketplace>` | `claude plugin uninstall <name>@<marketplace>` |
| Enable a disabled plugin | `/plugin enable <name>@<marketplace>` | `claude plugin enable <name>@<marketplace>` |
| Disable an enabled plugin | `/plugin disable <name>@<marketplace>` | `claude plugin disable <name>@<marketplace>` |
| Reload after in-session changes | `/reload-plugins` | (n/a — restart the session) |
| Drop orphaned auto-installed deps (alias: `autoremove`) | (n/a) | `claude plugin prune` |

### Authoring helpers (terminal-only)

| Operation | Command | Purpose |
|-----------|---------|---------|
| Validate manifest | `claude plugin validate <path>` | Lints both plugin manifests (`./plugins/<name>`) and marketplace manifests (`./.claude-plugin/marketplace.json`). Canonical pre-PR check. |
| Tag a release | `claude plugin tag <path>` | Creates a `<name>--v<version>` git tag and validates that `plugin.json` and the enclosing marketplace entry agree on name/version. |

### Pre-PR validation (canonical)

Run before opening a PR that touches any manifest:

```bash
# Marketplace
claude plugin validate ./.claude-plugin/marketplace.json

# Each affected plugin
claude plugin validate ./plugins/<name>
```

All four manifests in this repo currently pass; keep it that way.
