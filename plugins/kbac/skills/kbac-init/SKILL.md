---
name: kbac-init
description: >
  Use when setting up the kbac repository for the first time, bootstrapping
  a fresh clone, checking prerequisites, troubleshooting installation issues,
  onboarding a new contributor, or when any tool in the stack appears missing
  or misconfigured. Guides through Node.js, yarn, Docker, .env setup,
  cypher-shell, and Neo4j seeding.
---

# Repository Setup for kbac

## Overview

kbac requires Node.js 22+, yarn 3.7.0 (Berry), and Docker. Credentials live
in a gitignored `.env` file (created from `.env.example`) and are loaded via
Node's native `--env-file-if-exists` flag — no auth service, no biometric
prompts, no external resolver. Optionally install cypher-shell for ad-hoc
queries.

This skill guides through checking installations, setting up `.env`, and
bootstrapping the database with seed data.

## Auth Boundary

All phases below are `[auto]` — Claude can run them directly. The only
interactive step is `AskUserQuestion` in Phase 2 to capture the password
before writing it into `.env`.

## Prerequisites

### Required Tools

| Tool | Check | Required | Install | Notes |
|------|-------|----------|---------|-------|
| Node.js | `node -v` | ≥ 20.x | `brew install node` or nvm | LTS recommended |
| Corepack | `corepack -v` | ≥ 0.20 | `corepack enable` (ships with Node) | Enables yarn 3.x |
| yarn | `yarn -v` | 3.7.0 | Automatic via `packageManager` in package.json | Berry, not Classic |
| Docker | `docker -v` | ≥ 24.x | Docker Desktop for Mac | Must be running |
| docker compose | `docker compose version` | ≥ 2.x | Bundled with Docker Desktop | Plugin, not standalone |
| tsx | `npx tsx --version` | ≥ 4.x | In devDependencies | TypeScript runner |

### Optional but Recommended

| Tool | Check | Replaces | Install |
|------|-------|----------|---------|
| cypher-shell | `cypher-shell --version` | docker exec fallback | `brew install cypher-shell` |
| rg (ripgrep) | `rg --version` | grep | `brew install ripgrep` |
| fd | `fd --version` | find | `brew install fd` |
| sd | `sd --version` | sed | `brew install sd` |
| jq | `jq --version` | — (JSON processing) | `brew install jq` |
| yq | `yq --version` | — (YAML processing) | `brew install yq` |

### Quick Prerequisite Check

Run this one-liner to check all required tools:

```bash
for tool in node yarn docker "docker compose" tsx; do
  cmd=$(echo "$tool" | awk '{print $1}')
  if command -v "$cmd" &>/dev/null; then
    # NOTE: --version first; `$tool version` is destructive for Yarn Berry
    # (it bumps package.json), so it stays last as a fallback only.
    printf "✓ %-16s %s\n" "$tool" "$($tool --version 2>/dev/null || $tool -v 2>/dev/null || $tool version 2>/dev/null | head -1)"
  else
    printf "✗ %-16s NOT INSTALLED\n" "$tool"
  fi
done
```

## Bootstrap Flow

### Phase 1: Dependencies [auto]

```bash
# 1. Enable corepack for yarn 3.x
corepack enable

# 2. Install Node dependencies
yarn install

# 3. Verify TypeScript compiles clean
yarn type-check
```

If `yarn install` fails with a version error, ensure corepack is enabled — kbac's
`packageManager: "yarn@3.7.0"` in package.json requires Berry, not Classic yarn.

### Phase 2: Environment Setup [auto]

kbac loads credentials from a gitignored `.env` file using Node 22+'s
`--env-file-if-exists` flag. The committed `.env.example` is the canonical
template.

```bash
# 4. Copy the template
cp .env.example .env

# 5. Prompt for the password (use AskUserQuestion when running inside
#    Claude Code, sensitive=true) and write it into .env:
#    NEO4J_PASSWORD=<your strong password>
#
#    The Neo4j container uses this password on first launch; subsequent
#    db:up / db:reset runs must use the SAME password or auth will fail.

# 6. Verify the four required keys are present
node --env-file=.env -e 'const keys=["NEO4J_URI","NEO4J_USERNAME","NEO4J_DATABASE","NEO4J_PASSWORD"]; const missing=keys.filter(k=>!process.env[k]); if(missing.length){console.error("missing:",missing);process.exit(1)}; console.log("ok")'
```

If you prefer not to use a `.env` file (e.g. in CI), export the four
`NEO4J_*` vars in your shell — `--env-file-if-exists` is a graceful no-op
when the file is missing and the process inherits real env vars.

Real environment variables override `.env` values, so `NEO4J_PASSWORD=foo
yarn db:up` works for one-off invocations.

### Phase 3: Database Bootstrap [auto]

```bash
# 6. Start Neo4j container (pulls image on first run)
yarn db:up

# 7. Wait for Neo4j to be healthy (polls up to 60s)
yarn db:wait

# 8. Run all seed files in order
yarn db:seed
```

First run pulls the `neo4j:2026.02.3-community` image (~500MB). Subsequent
starts use the cached image and persistent named volume.

### Phase 4: Verification [auto]

```bash
# 9. Run smoke test (Cypher 25 syntax + APOC validation)
yarn cypher cypher/00-smoke-test.cypher

# 10. Introspect graph schema
yarn db:introspect

# 11. Verify node counts via cypher-shell (loads NEO4J_* from .env)
set -a; source .env; set +a
cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" \
  "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY label;"
```

Expected node count output (approximate):

```text
label    | count
---------+------
Concept  | 8
Domain   | 8
System   | 1
Tool     | 13
```

### Phase 5: CLI Path Setup [auto]

Installs the `kbac` command on `$PATH` by symlinking the repository's
`bin/kbac` wrapper into `~/.local/bin`. This enables the `/kbac` slash
command and lets you use `kbac` interactively from any terminal.

Run this phase only after Phase 4 verification succeeds, so the binary
you're symlinking is already known to work.

#### Steps

1. **Decide the repo path.** If `$KBAC_PROJECT_PATH` is set in your
   shell and points to a valid kbac repo, that wins. Otherwise the
   skill calls `AskUserQuestion` with the default `~/Github/kbac` to
   confirm or override.

2. **Validate.** The resolved path must contain `bin/kbac` (executable),
   `package.json`, and `cypher/`. If any check fails, the skill reports
   which one and loops back to step 1. The `resolveKbacPath` helper in
   `plugins/kbac/lib/resolve-kbac-path.ts` encodes the same validation
   so the plugin and the init skill agree.

3. **Check for a stale symlink.** If `~/.local/bin/kbac` already exists
   and points elsewhere, the skill shows the current target and
   confirms overwrite via `AskUserQuestion` before clobbering.

4. **Install the symlink.**

   ```bash
   ln -sf "$KBAC_REPO/bin/kbac" ~/.local/bin/kbac
   ```

5. **Persist the path** to the plugin's local settings file so other
   parts of the plugin can self-heal if the symlink is lost:

   ```bash
   mkdir -p "$CLAUDE_PLUGIN_ROOT/.claude"
   cat > "$CLAUDE_PLUGIN_ROOT/.claude/kbac.local.md" <<EOF
   ---
   kbac_path: $KBAC_REPO
   ---
   EOF
   ```

6. **Smoke-test the symlink** (must run *before* declaring success):

   ```bash
   kbac --version
   ```

   Expected: non-empty version line, exit 0. On failure, remove the
   symlink and report the underlying error.

7. **Verify `~/.local/bin` is on `$PATH`.** If not, surface the exact
   line the user should add to `~/.zshrc` themselves:

   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   ```

   Do not modify `~/.zshrc` automatically — surface the line and let
   the user decide.

#### Auth boundary

This phase is `[auto]` — no biometric required. The smoke test in
step 6 invokes `kbac --version`, which does not connect to Neo4j and
needs no credentials at all.

## Port Configuration

kbac uses offset ports to avoid conflict with other Neo4j instances:

| Protocol | kbac Port | Default Neo4j Port |
|----------|----------|--------------------|
| Bolt | 7688 | 7687 |
| HTTP | 7475 | 7474 |

If ports are busy: `docker ps` to check, then `docker stop <container>` the conflicting container.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `NEO4J_PASSWORD is required` | `.env` is missing or has no password | `cp .env.example .env`, then edit and set NEO4J_PASSWORD |
| Auth failure on Bolt | `.env` password differs from container's | Either re-create container with `yarn db:reset` (destroys data) or restore the original password in `.env` |
| `--env-file-if-exists=` not allowed | Node version below 22 | `brew install node` or `nvm install 22` |
| `Error: port 7688 already in use` | Another container on that port | `docker ps`, then `docker stop` the conflict |
| `Neo4j not healthy after 60s` | Container failed to start | `docker logs neo4j-2026 --tail 50` |
| `yarn: command not found` | Corepack not enabled | `corepack enable` then retry |
| `Unexpected token` in TypeScript | Wrong Node.js version | Need Node ≥ 22 for `--env-file` support |
| `APOC procedures not found` | Plugin load failure | Check `NEO4J_PLUGINS` in docker-compose.yml |

## Teardown

```bash
# Stop Neo4j (preserves data volume)
yarn db:down

# Full reset: destroy volume + recreate + reseed (requires typing "reset graph")
yarn db:reset
```
