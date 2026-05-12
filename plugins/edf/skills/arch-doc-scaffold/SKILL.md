---
name: arch-doc-scaffold
description: >
  Use when scaffolding a new system architecture documentation set —
  produces SYSTEM.md (overview), INDEX.md (nav), plus optional
  architecture.md, components.md, api.md, getting-started.md,
  troubleshooting.md, claude-context.md sub-area files. Output is
  EDF-compliant and reflects the docs/systems/<name>/ convention used
  by the @austyle-io/edf library.
---

# System Architecture Doc Scaffold

This skill bootstraps a complete EDF-compliant system architecture
documentation set for a new subsystem. It generates the canonical file
layout, frontmatter, and navigation scaffolding so that a fresh system
ships with Tier 1 documentation from day one.

## When to use this skill

- Standing up documentation for a new subsystem or service
- Upgrading a minimal `README.md`-only system to the full EDF set
- Producing a consistent docs starting point across plugins
- Onboarding a system into the `docs/systems/<name>/` convention

If you only need to score or audit existing docs, use a documentation
audit skill instead. If you need a single EDF document (agent, skill,
runbook), use `edf-authoring`.

## Output convention

All output conforms to the `docs/systems/<name>/` convention used by
the `@austyle-io/edf` library:

```text
docs/systems/<system-name>/
├── SYSTEM.md              # Main entry point and overview
├── INDEX.md               # Navigation table of contents
├── claude-context.md      # AI session onboarding
├── architecture.md        # Architecture diagrams and layering
├── components.md          # Component inventory
├── api.md                 # API / CLI reference
├── getting-started.md     # Quick start guide
└── troubleshooting.md     # FAQ and common issues
```

`<system-name>` is kebab-case (e.g. `crucible-league`,
`ralph-iso-loop`). For plugin-local docs, the full path is
`plugins/<plugin>/docs/systems/<system-name>/`.

## Scaffold workflow

1. Resolve the target directory (`docs/systems/<system-name>/`).
2. Confirm with the user what optional sub-area files are needed.
3. Create the directory if missing.
4. Emit `SYSTEM.md` and `INDEX.md` (always).
5. Emit the requested sub-area files using the templates below.
6. Cross-link the files: `INDEX.md` links to every sub-area, `SYSTEM.md`
   links to the deep-dive files, and each sub-area links back to
   `SYSTEM.md`.

## File templates

### SYSTEM.md

```markdown
---
title: <System Name>
status: active
last_updated: <YYYY-MM-DD>
---

# <System Name>

> One-line system purpose.

## Quick stats

| Metric | Value |
|--------|-------|
| Components | <count> |
| Documents | <count> |
| Test coverage | <percent or n/a> |
| Dependencies | <count> |

## System at a glance

Two to three paragraphs describing what this system does, who uses it,
and how it fits into the broader architecture.

### Key capabilities

- **Capability 1** — short description
- **Capability 2** — short description

## Architecture overview

See [architecture.md](./architecture.md) for detailed diagrams.

## Component inventory

| Component | Path | Purpose |
|-----------|------|---------|
| Example | `src/example.ts` | What it does |

See [components.md](./components.md) for full details.

## Getting started

See [getting-started.md](./getting-started.md).

## Related systems

| System | Relationship |
|--------|--------------|
| `../<other>/` | depends-on / used-by / related-to |
```

### INDEX.md

```markdown
---
title: <System Name> — Index
last_updated: <YYYY-MM-DD>
---

# <System Name> — Navigation

| Need | Document |
|------|----------|
| System overview | [SYSTEM.md](./SYSTEM.md) |
| AI onboarding | [claude-context.md](./claude-context.md) |
| Architecture | [architecture.md](./architecture.md) |
| Components | [components.md](./components.md) |
| API reference | [api.md](./api.md) |
| Quick start | [getting-started.md](./getting-started.md) |
| Troubleshooting | [troubleshooting.md](./troubleshooting.md) |
```

### claude-context.md

```markdown
---
title: <System Name> — Session Context
purpose: AI session onboarding for <system-name>
---

# <System Name> — Session Context

> **System**: <system-name>
> **Purpose**: One-line purpose.

## Quick onboarding

1. Read [SYSTEM.md](./SYSTEM.md) for the system overview.
2. Read [INDEX.md](./INDEX.md) to locate deeper docs.
3. For implementation details, see [components.md](./components.md).
```

### architecture.md

```markdown
---
title: <System Name> — Architecture
---

# <System Name> — Architecture

## Layer diagram

```text
┌─────────────────────────────────────────┐
│                <NAME>                   │
├─────────────────────────────────────────┤
│ Layer 1 │ Component A │ Component B     │
├─────────────────────────────────────────┤
│ Layer 2 │ Component C │ Component D     │
└─────────────────────────────────────────┘
```

## Layer assignment

| Layer | Responsibility | Key components |
|-------|----------------|----------------|
| 1 | … | … |
| 2 | … | … |

## Data flow

Describe the principal request / event flow through the system.
```

### components.md, api.md, getting-started.md, troubleshooting.md

Each sub-area file follows the same shape: YAML frontmatter with
`title`, an H1 matching the title, a back-link to `SYSTEM.md`, and the
canonical sections below.

```markdown
---
title: <System Name> — <Area>
---

# <System Name> — <Area>

> Back to [SYSTEM.md](./SYSTEM.md).

<area-specific sections>
```

Canonical sections per area:

- **components.md** — single table `| Component | Path | Purpose | Notes |`
- **api.md** — one section per endpoint/command with Signature, Inputs,
  Outputs, Errors
- **getting-started.md** — Prerequisites, Install, First run, Next steps
- **troubleshooting.md** — Common issues (Symptom / Cause / Resolution),
  Diagnostics

## Frontmatter conventions

- `title` — human-readable doc name (required on every file)
- `status` — `active` | `draft` | `deprecated` (SYSTEM.md only)
- `last_updated` — `YYYY-MM-DD` (SYSTEM.md, INDEX.md)
- `purpose` — short purpose string (claude-context.md)
- Keep frontmatter minimal — no plugin lore, no version stamps unless
  the system genuinely versions its docs.

## Navigation conventions

- `INDEX.md` is the single source of truth for cross-file navigation.
- `SYSTEM.md` links forward to deep-dive docs but never duplicates
  large content blocks already in them.
- Every sub-area file links back to `SYSTEM.md` in its first paragraph
  so a reader landing in the middle can find the top.
- Use relative links (`./architecture.md`), never absolute paths.

## Layer assignment guidance

When filling in `architecture.md`, assign every component to exactly
one layer. Use the smallest number of layers that still captures the
system shape — typically 2-4:

- **Edge / Interface** — anything user- or network-facing
- **Domain / Logic** — pure business rules
- **Infrastructure** — persistence, queues, external services

If a component spans layers, split it. Cross-layer components are an
architectural smell to surface in `troubleshooting.md`.

## Example invocation

```text
> Scaffold docs for a new system called "ralph-iso-loop" with all
> sub-area files.

→ Creates docs/systems/ralph-iso-loop/{SYSTEM,INDEX,claude-context,
   architecture,components,api,getting-started,troubleshooting}.md
   with the templates above, kebab-cased title placeholders replaced,
   and INDEX.md wired to every file.
```

## Done criteria

A scaffold is complete only when:

- `SYSTEM.md` and `INDEX.md` exist and cross-link to every sub-area
  that was generated.
- Every generated file has valid frontmatter.
- All internal links resolve (no broken relative paths).
- Placeholder strings (`<System Name>`, `<system-name>`, `<count>`,
  dates) are replaced with real values before the system is presented
  as ready for editing.
