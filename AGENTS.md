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
- Any command or script requiring 1Password / Varlock biometric auth must be clearly marked `[auth]` in skills and agents.
- Commands Claude can run directly are marked `[auto]`.

## kbac plugin — known constraints
- The SessionStart hook (`kbac-session-context.ts`) declares its own dependencies in `hooks/package.json`. When the plugin is installed, `pnpm install` (or equivalent) must run inside the `hooks/` directory to make `typebox` and `ajv` available.
- The `hooks.json` matcher `"startup|clear|compact"` must be validated against the Claude Code hook spec to confirm regex matchers are supported.
