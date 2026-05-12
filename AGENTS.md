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

- The SessionStart hook (`kbac-session-context.ts`) declares its own dependencies in `hooks/package.json`. When the plugin is installed, `pnpm install` (or equivalent) must run inside the `hooks/` directory to make `typebox` and `ajv` available.
- The `hooks.json` matcher `"startup|clear|compact"` must be validated against the Claude Code hook spec to confirm regex matchers are supported.

## edf plugin — conventions

- The plugin is a companion to the [`@austyle-io/edf`](https://github.com/austyle-io/edf) TypeScript library. Validation runs from that repo: `cd /path/to/@austyle-io/edf && pnpm exec tsx src/validator/cli.ts /path/to/this/plugin`.
- The shipping validator only emits error codes `EDF001` (reference target not found), `EDF002` (circular reference), `EDF003` (version constraint), `EDF004` (invalid reference format), `EDF005` (Neo4j target not in graph), plus free-form `W*` warnings. Treat additional codes (e.g. `E-FM-NNN`, `E-LAY-NNN`) as hallucinations.
- The CLI is a checker only — there is no `--fix` flag. Apply fixes by editing the document directly and re-running the validator.
- Layer markers use the canonical `<!-- @layer:N -->` HTML-comment form (`load="on-demand"` on layer 3, `load="on-failure"` on layer 4). The legacy `<!-- Layer N: Name -->` form is removed. Layer 1 is mandatory; 2–4 are optional but, if present, must appear in order with no gaps.
- Forbidden component-doc frontmatter fields: `edf:`, `version:`, `related:`. The forbidden-fields rule applies to the four EDF component types (`agent`, `skill`, `command`, `hook`); runbooks are runtime artifacts with their own frontmatter shape (see `skills/edf-validation-rules` Runbook-frontmatter section) and may carry `version:` and `type: runbook`.
- Agent `tools:` arrays must include every tool the agent body references. In particular, an agent that delegates to sub-agents needs `Agent` (the renamed-in-2.1.63 successor to `Task`) declared explicitly — `BashOutput` is implicit when `Bash` is declared.
- For canonical guidance see the plugin's own skills: `edf-validation-rules` (rules), `edf-authoring` (write), `edf-validate` (run validator), `plugin-edf-audit` (bulk compliance scan), `edf-stats` (quantitative metrics). For narrative review, dispatch the `edf-doc-reviewer` agent.
