---
name: kbac-init
description: >
  Use when setting up the kbac repository for the first time, bootstrapping
  a fresh clone, checking prerequisites, troubleshooting installation issues,
  onboarding a new contributor, or when any tool in the stack appears missing
  or misconfigured. Guides through Node.js, yarn, Docker, 1Password, Varlock,
  cypher-shell, and Neo4j setup with clear marking of auth-gated steps.
---

# Repository Setup for kbac

## Overview

kbac requires Node.js, yarn 3.7.0 (Berry), Docker, 1Password + Varlock for
credential management, and optionally cypher-shell for ad-hoc queries. This
skill guides through checking and installing everything, then bootstrapping
the database with seed data.

## Auth Boundary

Many kbac commands use `varlock run` which triggers 1Password biometric auth.
Claude cannot complete biometric prompts. Commands below are marked:

- **[auto]** — Claude can run this directly
- **[auth]** — Requires 1Password. User must run via `!` prefix in Claude Code

## Prerequisites

### Required Tools

| Tool | Check | Required | Install | Notes |
|------|-------|----------|---------|-------|
| Node.js | `node -v` | ≥ 20.x | `brew install node` or nvm | LTS recommended |
| Corepack | `corepack -v` | ≥ 0.20 | `corepack enable` (ships with Node) | Enables yarn 3.x |
| yarn | `yarn -v` | 3.7.0 | Automatic via `packageManager` in package.json | Berry, not Classic |
| Docker | `docker -v` | ≥ 24.x | Docker Desktop for Mac | Must be running |
| docker compose | `docker compose version` | ≥ 2.x | Bundled with Docker Desktop | Plugin, not standalone |
| 1Password CLI | `op --version` | ≥ 2.x | `brew install 1password-cli` | Needs desktop app too |
| 1Password Desktop | — | Latest | Mac App Store or 1password.com | Must be running + unlocked |
| Varlock | `npx varlock --version` | ≥ 0.7.x | In project dependencies | Resolves `op()` refs |
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
for tool in node yarn docker "docker compose" op tsx; do
  cmd=$(echo "$tool" | awk '{print $1}')
  if command -v "$cmd" &>/dev/null; then
    printf "✓ %-16s %s\n" "$tool" "$($tool version 2>/dev/null || $tool -v 2>/dev/null || $tool --version 2>/dev/null | head -1)"
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

### Phase 2: Credential Verification [auth]

These steps require the 1Password desktop app to be running and unlocked.
In Claude Code, the user must run these via `!` prefix.

```bash
# 4. Verify Varlock can resolve all credential references
npx varlock load

# 5. Regenerate environment type definitions
npx varlock typegen
```

If `varlock load` fails:
- Ensure 1Password desktop app is running and unlocked
- Check that the vault referenced in `.env.schema` exists
- Verify `op://vault/Neo4j 2026/password` item exists in 1Password

### Phase 3: Database Bootstrap [auth]

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

### Phase 4: Verification [auth]

```bash
# 9. Run smoke test (Cypher 25 syntax + APOC validation)
yarn cypher cypher/00-smoke-test.cypher

# 10. Introspect graph schema
yarn db:introspect

# 11. Verify node counts
npx varlock run -- sh -c 'cypher-shell -a bolt://localhost:7688 -u neo4j -p "$NEO4J_PASSWORD" "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY label;"'
```

Expected node count output (approximate):
```
label    | count
---------+------
Concept  | 8
Domain   | 8
System   | 1
Tool     | 13
```

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
| `op: command not found` | 1Password CLI missing | `brew install 1password-cli` |
| `Cannot connect to 1Password` | Desktop app not running | Open 1Password, unlock with biometrics |
| `Error: port 7688 already in use` | Another container on that port | `docker ps`, then `docker stop` the conflict |
| `Neo4j not healthy after 60s` | Container failed to start | `docker logs neo4j-2026 --tail 50` |
| `yarn: command not found` | Corepack not enabled | `corepack enable` then retry |
| `Unexpected token` in TypeScript | Wrong Node.js version | Need Node ≥ 20.x for ES2022 support |
| `APOC procedures not found` | Plugin load failure | Check `NEO4J_PLUGINS` in docker-compose.yml |
| Varlock `op()` parse error | Spaces in 1Password item name | Use quoted form: `op("op://vault/Neo4j 2026/password")` |

## Teardown

```bash
# Stop Neo4j (preserves data volume)
yarn db:down

# Full reset: destroy volume + recreate + reseed (requires typing "reset graph")
yarn db:reset
```
