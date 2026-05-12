---
name: runbook-scaffold
description: >
  Use when creating a new runbook from scratch — produces a stub with correct
  YAML frontmatter (name, version, description, tags), an initial phase
  template, and the cleanup-phase scaffold (`<!-- cleanup-phase -->`,
  `<!-- run: always -->`). Companion to the `runbook-authoring` skill (the
  authoring reference for format details, markers, and check patterns) and the
  `runbook-executor` agent (which runs the finished runbook end-to-end).
---

# Runbook Scaffold

Scaffold a new, ready-to-edit runbook stub. This skill is the **starting
point** for a new runbook: it gathers minimum metadata, emits a valid
frontmatter block, lays down one initial phase, and includes the mandatory
cleanup-phase scaffold with the correct execution markers.

For deeper authoring guidance (full marker reference, check patterns,
troubleshooting templates), defer to the `runbook-authoring` skill once the
stub exists. For execution semantics, see the `runbook-executor` agent.

---

## When to Use This Skill

Use this skill when the user wants to:

- Create a new runbook (`docker-integration-test`, `release-checklist`, etc.).
- Convert an ad-hoc workflow into a structured, executable runbook.
- Start from a clean, conforming stub rather than a blank file.

Do **not** use this skill for:

- Editing an existing runbook → use the `runbook-authoring` skill.
- Running a runbook → invoke the `runbook-executor` agent.

---

## Required Metadata

Before scaffolding, gather (or infer from context) these inputs:

| Field         | Required | Notes                                                          |
| ------------- | -------- | -------------------------------------------------------------- |
| `name`        | yes      | kebab-case identifier; matches the filename without extension. |
| `version`     | yes      | Start at `"1.0.0"`; bump on substantive change.                |
| `description` | yes      | One- or two-line summary of what the runbook accomplishes.     |
| `tags`        | yes      | 2–5 lowercase tags for discovery (e.g. `[test, docker, ci]`).  |
| `purpose`     | yes      | What outcome does this runbook produce?                        |
| `phases`      | yes      | Rough list of major steps (cleanup is added automatically).    |
| `cleanup`     | yes      | Resources to release: processes, files, containers, networks.  |

If any required field is missing, ask the user one targeted question per field
before generating the stub. Do **not** invent values silently.

---

## Output Location

Write the new runbook to:

```
.agents/runbooks/{name}.md
```

If the directory does not exist, create it. Do not overwrite an existing
runbook without explicit user confirmation.

---

## Frontmatter Template

Every runbook starts with this YAML block. Substitute the bracketed values;
keep field names and order stable so tooling can parse reliably.

```yaml
---
name: {name}
type: runbook
version: "1.0.0"
description: >
  {one- or two-line summary of the runbook's purpose}
tags: [{tag1}, {tag2}, {tag3}]
---
```

Notes:

- `description` uses the YAML `>` folded-block form to allow line breaks
  without escaping.
- `tags` is a flow-style sequence (`[a, b, c]`) for compact diffs.
- Omit optional fields (`author`, `created`, `estimated_duration`,
  `complexity`) from the stub — they can be added later if useful.

---

## Body Skeleton

After the frontmatter, the stub body has four sections in this order:

1. `# {Title}` — title derived from `name`, in Title Case.
2. `## Overview` — short paragraph describing purpose and scope.
3. `## Prerequisites` — checklist of preconditions.
4. `## Phase 1: {First Phase}` — initial phase with one example check.
5. `## Phase N: Cleanup` — cleanup phase with required markers.

The initial phase is a **template**, not a finished phase — the user is
expected to flesh it out. The cleanup phase is **non-negotiable** and must
include both the `<!-- cleanup-phase -->` and `<!-- run: always -->` markers.

---

## Initial Phase Template

```markdown
## Phase 1: {First Phase Name}

**Goal**: {what this phase accomplishes}

### Checks

- [ ] **{Check Name}**
  - Command: `{shell command}`
  - Success: {observable criterion that proves the check passed}
  - On failure: {actionable remediation step}
```

Guidance for the user when they edit this template:

- One check, one verifiable command. Avoid bundled scripts.
- Success criteria must be **observable** (exit code, file presence, log
  match) — not "looks right".
- On-failure remediation must be **actionable** — a concrete next step,
  not "debug it".

---

## Cleanup Phase Scaffold

The cleanup phase is mandatory. It is always the last phase, always runs
(even after upstream failure), and is idempotent.

```markdown
## Phase N: Cleanup
<!-- cleanup-phase -->
<!-- run: always -->

**Goal**: Release all resources created during execution.

### Steps

1. [ ] **Terminate Background Tasks**
   <!-- cleanup-background-tasks -->
   - Action: Kill any background processes spawned during execution.

2. [ ] **Remove Test Resources**
   - Command: `{cleanup command} || true`
   - Success: Command exits 0 (trailing `|| true` makes it idempotent).
```

Marker contract:

- `<!-- cleanup-phase -->` — flags the phase as the cleanup phase.
- `<!-- run: always -->` — forces execution regardless of prior failures.
- `<!-- cleanup-background-tasks -->` — instructs the executor to terminate
  any tracked background tasks.

For the full marker reference, see the `runbook-authoring` skill.

---

## Scaffolding Protocol

When invoked, follow this protocol step by step.

### Step 1 — Confirm intent

Confirm the runbook `name` (kebab-case) and `description`. If the user
supplied only a topic, propose a name and wait for confirmation.

### Step 2 — Collect metadata

Ask only for fields not already supplied: `version` (default `"1.0.0"`),
`tags`, `purpose`, rough `phases`, and `cleanup` resources. One targeted
question per missing field — do not flood the user.

### Step 3 — Assemble the stub

Build the file content in this order:

1. YAML frontmatter (see template above).
2. `# {Title}` derived from `name`.
3. `## Overview` paragraph from `purpose`.
4. `## Prerequisites` checklist (one bullet placeholder if unknown).
5. `## Phase 1: {first phase}` from the template.
6. `## Phase N: Cleanup` from the cleanup scaffold.

### Step 4 — Validate before write

Before writing, verify:

- [ ] Frontmatter has `name`, `type: runbook`, `version`, `description`, `tags`.
- [ ] `name` is kebab-case and matches the target filename.
- [ ] Phase 1 has a Goal and at least one check with Command, Success, and
      On-failure fields.
- [ ] Cleanup phase has both `<!-- cleanup-phase -->` and
      `<!-- run: always -->` markers.
- [ ] No empty required fields, no placeholder `{...}` tokens left in
      load-bearing positions.

If any check fails, fix before writing.

### Step 5 — Write and confirm

Write to `.agents/runbooks/{name}.md`. Confirm to the user with the file
path and recommend the next step — typically editing via the
`runbook-authoring` skill, or executing via the `runbook-executor` agent
once the runbook is complete.

---

## Phase Sketches

Common starting phase sets the user may pick from. These are **sketches**,
not full phases — the user fleshes them out.

- **Integration test**: Environment Setup → Build → Test Execution →
  Result Validation → Cleanup.
- **Deployment**: Pre-flight Checks → Backup → Deploy → Health Verification
  → Rollback (conditional) → Cleanup.
- **Maintenance**: Service Status Check → Maintenance Window Entry →
  Maintenance Tasks → Verification → Maintenance Window Exit → Cleanup.

---

## Cross-References

- `runbook-authoring` skill — full authoring reference: marker semantics,
  phase patterns, check design, troubleshooting templates. Use after the
  stub exists.
- `runbook-executor` agent — executes the finished runbook end-to-end,
  honoring markers and the cleanup-always contract.
