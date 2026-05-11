---
name: kbac-toolchain
description: >
  Use when choosing CLI tools for searching code, finding files, replacing
  text, or processing JSON/YAML in the kbac repository. Checks which modern
  tools (rg, fd, sd, jq, yq) are available on the system and recommends
  them over legacy equivalents (grep, find, sed). Also use when writing
  shell scripts, hook scripts, or build tooling that needs portable tool
  selection.
---

# CLI Toolchain for kbac

## Overview

kbac uses modern Rust-based CLI tools for code search, file discovery, text
replacement, and structured data processing. For general tool installation,
syntax divergences, and anti-patterns, see the
[`modern-unix-tools`](../../modern-unix-tools/skills/modern-unix-tools/SKILL.md)
plugin — this skill covers only **kbac-specific usage patterns**.

## Quick Detection

```bash
for tool in rg fd sd jq yq; do
  if command -v "$tool" &>/dev/null; then
    printf "✓ %-4s %s\n" "$tool" "$($tool --version 2>&1 | head -1)"
  else
    printf "✗ %-4s not installed\n" "$tool"
  fi
done
```

## Usage Patterns for kbac

### Searching Code — rg over grep

```bash
# Find all MERGE statements across seed files
rg 'MERGE' cypher/

# Find TypeBox schema definitions with context
rg 'export const.*Schema' -C 2 src/schemas/

# Search only .cypher files, case-insensitive
rg -i 'depends_on' -t cypher cypher/
# (Register type first if needed: rg --type-add 'cypher:*.cypher' -t cypher 'MERGE' cypher/)

# Count matches per file
rg -c 'MERGE' cypher/

# Search with fixed string (no regex)
rg -F 'Type.Object({' src/schemas/
```

Legacy equivalent (when rg unavailable):

```bash
grep -rn 'MERGE' cypher/
```

### Finding Files — fd over find

```bash
# Find all .cypher files
fd -e cypher

# Find all TypeScript files in src/
fd -e ts src/

# Find seed files matching a pattern
fd 'seed' cypher/

# Find files modified in the last hour
fd -e ts --changed-within 1h

# Find and execute (like find -exec)
fd -e cypher -x wc -l {}
```

Legacy equivalent:

```bash
find . -name '*.cypher' -type f
```

### Text Replacement — sd over sed

```bash
# Rename a property across all schema files
sd 'oldPropName' 'newPropName' src/schemas/*.ts

# Rename a node label in seed files
sd 'OldLabel' 'NewLabel' cypher/*.cypher

# Regex replacement (sd uses regex by default)
sd 'version: "\d+\.\d+\.\d+"' 'version: "2.0.0"' cypher/06-seed-systems.cypher

# Preview changes without writing (pipe through)
cat src/schemas/nodes.ts | sd 'ToolSchema' 'InstrumentSchema'
```

Legacy equivalent (portable across GNU and BSD/macOS sed):

```bash
# Detect sed flavor; GNU sed rejects `sed -i ''`, BSD/macOS sed requires it.
if sed --version >/dev/null 2>&1; then
  sed -i    's/oldPropName/newPropName/g' src/schemas/*.ts  # GNU sed
else
  sed -i '' 's/oldPropName/newPropName/g' src/schemas/*.ts  # BSD/macOS sed
fi
```

### JSON Processing — jq

Essential for hook scripts and build tooling:

```bash
# Pretty-print hook output
tsx hooks/scripts/kbac-session-context.ts | jq .

# Extract script names from package.json
jq '.scripts | keys[]' package.json

# Check plugin manifest
jq '{name, version, description}' .claude-plugin/plugin.json

# Validate JSON syntax (exit code 0 = valid)
jq empty hooks/hooks.json

# Extract nested values
jq -r '.hooks.SessionStart[0].matcher' hooks/hooks.json
```

### YAML Processing — yq

Useful for skill and agent frontmatter:

```bash
# Extract skill name from frontmatter
yq --front-matter=extract '.name' skills/kbac-cyphers/SKILL.md

# List all skill names
for f in skills/*/SKILL.md; do
  echo "$(yq --front-matter=extract '.name' "$f")"
done

# Extract agent model setting
yq --front-matter=extract '.model' agents/kbac-cypher-reviewer.md

# Validate YAML frontmatter syntax
yq --front-matter=extract '.' skills/kbac-init/SKILL.md > /dev/null && echo "valid"
```

## Writing Portable Scripts

When writing hook scripts or build tooling for kbac, always include a
fallback so the script works on systems without the modern tool:

```bash
# Pattern: prefer modern, fall back to legacy
search_code() {
  local pattern="$1" dir="$2"
  if command -v rg &>/dev/null; then
    rg "$pattern" "$dir"
  else
    grep -rn "$pattern" "$dir"
  fi
}

find_files() {
  local ext="$1" dir="${2:-.}"
  if command -v fd &>/dev/null; then
    fd -e "$ext" "$dir"
  else
    find "$dir" -name "*.$ext" -type f
  fi
}

replace_text() {
  local from="$1" to="$2" file="$3"
  if command -v sd &>/dev/null; then
    sd "$from" "$to" "$file"
  elif sed --version >/dev/null 2>&1; then
    sed -i    "s/$from/$to/g" "$file"   # GNU sed (Linux)
  else
    sed -i '' "s/$from/$to/g" "$file"   # BSD/macOS sed
  fi
}
```

## Claude Code Integration

The SessionStart hook detects which of these tools are available and injects
them into the session context. When rg/fd/sd/jq/yq are detected, Claude
will prefer them automatically in Bash commands.

For Claude Code's built-in tools: the Grep tool uses ripgrep internally
and Glob uses a fast matcher — so these already benefit from modern tooling.
The CLI recommendations apply to Bash tool usage, hook scripts, and
one-liners you write manually.
