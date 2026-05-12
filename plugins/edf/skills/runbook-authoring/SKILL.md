---
name: runbook-authoring
description: >
  Use when authoring a new runbook or refactoring an existing one — structured
  multi-phase execution docs that the `runbook-executor` agent runs. Provides
  the runbook YAML frontmatter shape, phase structure, HTML-comment execution
  markers (timeout, parallel, background, cleanup, delegation), check patterns
  with on-failure remediation, and the cleanup-always principle. Companion
  to the `runbook-scaffold` skill (which creates the initial runbook stub)
  and the `runbook-executor` agent (which runs the finished runbook).
---

<!-- @layer:1 -->

# Runbook Authoring

A runbook is a structured Markdown document with YAML frontmatter that the
`runbook-executor` agent runs end-to-end. Runbooks bridge human intent and
machine execution: humans review and version them; agents parse the phase
structure and HTML-comment markers to drive deterministic execution.

A well-authored runbook is:

1. **Human-readable** — easy to review in PR diffs, easy to maintain.
2. **Machine-parseable** — phase/check structure and execution markers are
   unambiguous.
3. **Self-documenting** — includes prerequisites, troubleshooting, and the
   expected shape of results.
4. **Deterministic** — every check has explicit success criteria and
   on-failure remediation.

---

## File layout

Runbooks live under `.agents/runbooks/` (or the equivalent location the
project has standardized on):

```text
.agents/
├── runbooks/
│   ├── README.md          # Format guide
│   └── {name}.md          # Individual runbooks
└── schemas/
    └── runbook-result.schema.json
```

---

## YAML frontmatter

Every runbook starts with required frontmatter. Minimum shape:

```yaml
---
name: runbook-name              # Unique identifier (kebab-case)
type: runbook                   # Always "runbook"
version: "1.0.0"                # Semantic version
description: >                  # What this runbook does and when to use it
  Brief multi-line description.
tags: [docker, integration]     # Searchable tags
---
```

Optional fields for discovery and result validation:

```yaml
estimated_duration: 15-30 minutes
complexity: low | medium | high
result_schema: schema-name.json   # JSON Schema for result payload
delegates_to: [some-agent]        # Agents this runbook may invoke
required_tools: [Bash, Docker]    # Tools the executor needs
```

For a complete starter scaffold (including the cleanup-phase marker), use
the `runbook-scaffold` skill — it produces a valid runbook stub from a
single intent prompt.

---

## Body structure

The Markdown body follows a fixed shape so the executor can parse it:

```markdown
# Runbook Title

## Overview
Natural-language description of purpose and scope.

## Prerequisites
- [ ] Prerequisite 1 with verification command
- [ ] Prerequisite 2 with verification command

## Phase 1: Name

**Goal**: What this phase accomplishes.

**Depends on**: Previous phases (optional).

### Checks

- [ ] **Check Name**
  - Command: `command to run`
  - Success: What indicates success
  - On failure: What to do if it fails

## Phase N: Cleanup
<!-- cleanup-phase -->
<!-- run: always -->

...

## Validation Conditions Summary
[Table of all pass/fail criteria]

## Troubleshooting
### Issue Category
**Symptoms**: ...
**Solutions**: ...
```

Every phase needs a **Goal**. Every check needs **Command**, **Success**, and
**On failure**. The cleanup phase at the end is mandatory.

---

## HTML-comment execution markers

The executor reads HTML comments as execution hints. They don't render in
GitHub previews but the parser picks them up.

### Timeout

```markdown
- [ ] **Long Running Task**
  <!-- timeout: 600s -->
  - Command: `docker buildx bake prod --load`
  - Success: Exit code 0
```

Format: `<!-- timeout: <number><unit> -->` where unit is `s`, `m`, or `ms`.
Specify timeouts for any command expected to take more than 30 seconds.

### Parallel execution

```markdown
### Checks

<!-- parallel-start -->
<!-- background-required -->
- [ ] **Task A**
  - Command: `long-running-command-a`
  - Background: true
  - Success: Exit code 0

- [ ] **Task B**
  - Command: `long-running-command-b`
  - Background: true
  - Success: Exit code 0
<!-- parallel-end -->
```

Rules:

- Checks between `<!-- parallel-start -->` and `<!-- parallel-end -->` may
  execute concurrently.
- `<!-- background-required -->` forces background-task execution so the
  executor tracks task IDs for cleanup.

### Retry

```markdown
- [ ] **Flaky Check**
  <!-- retry: 3 -->
  - Command: `sometimes-fails-command`
  - Success: Exit code 0
  - On failure: Clear cache and retry
```

The executor runs the "On failure" remediation then re-runs the check, up to
the retry count. Reserve retries for genuinely flaky operations — don't use
them to paper over real bugs.

### Cleanup phase (required)

Every runbook ends with a cleanup phase that always runs:

```markdown
## Phase N: Cleanup
<!-- cleanup-phase -->
<!-- run: always -->

**Goal**: Clean up all resources created during execution.

**Run**: Always, regardless of previous phase results.

### Steps

1. [ ] **Terminate Background Tasks**
   <!-- cleanup-background-tasks -->
   - Action: Kill all background tasks spawned during execution
   - Success: All background task IDs terminated

2. [ ] **Remove Test Resources**
   - Command: `cleanup-command || true`
   - Success: Always succeeds (idempotent)
```

The cleanup-always principle: a runbook that doesn't clean up after itself
leaves the system worse than it found it. Cleanup steps must be idempotent
and survive earlier-phase failures.

### Delegation

When a phase or check should be handed off to a specialized agent:

```markdown
## Phase 2: Security Scan
<!-- delegates-to: some-security-agent -->
<!-- required-tools: Bash, docker -->
<!-- tags: security, compliance -->
```

Check-level delegation:

```markdown
- [ ] **Vulnerability Scan**
  <!-- delegates-to: some-security-agent -->
  <!-- required-tools: docker -->
  - Command: `docker scan app:latest`
```

---

## Check patterns

### Basic validation

```markdown
- [ ] **Docker Running**
  - Command: `docker info`
  - Success: Exit code 0
  - On failure: Start Docker Desktop
```

### Output matching

```markdown
- [ ] **Correct Node Version**
  - Command: `node --version`
  - Success: Output matches `v24.x.x`
  - On failure: Install Node 24 via nvm
```

### Service health check

```markdown
- [ ] **API Responding**
  <!-- timeout: 30s -->
  - Command: `curl -sf http://localhost:8080/health`
  - Success: HTTP 200 with `{"status":"healthy"}`
  - On failure: Check service logs
```

### Background task

```markdown
- [ ] **Start Dev Server**
  - Command: `make dev`
  - Background: true
  - Success: Process started with PID
  - Health check: `curl -sf http://localhost:3000`
```

### Optional check

```markdown
- [ ] **Nice-to-Have Check** *(optional)*
  - Command: `optional-validation`
  - Success: Additional confidence
  - On failure: Warning only, continue execution
```

---

## Result payload

When the `runbook-executor` agent finishes, it emits JSON conforming to the
`result_schema` (if specified). The shape looks like:

```json
{
  "runbook": "docker-backend-integration",
  "version": "1.0.0",
  "status": "success",
  "startTime": "2025-12-09T18:30:00Z",
  "endTime": "2025-12-09T18:45:23Z",
  "durationSeconds": 923,
  "phases": [
    {
      "name": "Environment Verification",
      "status": "passed",
      "executionMode": "parallel",
      "checks": [
        {
          "name": "Docker Running",
          "passed": true,
          "command": "docker info",
          "exitCode": 0,
          "durationMs": 245,
          "attempts": 1
        }
      ]
    }
  ],
  "backgroundTasks": {
    "totalSpawned": 2,
    "completedNormally": 1,
    "terminatedDuringCleanup": 1,
    "failed": 0
  },
  "summary": {
    "totalChecks": 34,
    "passed": 34,
    "failed": 0,
    "skipped": 0,
    "passRate": 100
  }
}
```

Author runbooks with this shape in mind: every check name, command, and
success criterion ends up surfaced in the result.

---

## Troubleshooting section

Don't skip this section. The executor surfaces it to the user when a check
fails. Pattern:

```markdown
## Troubleshooting

### Build Failures

**Symptoms**: Phase 2 fails with "out of memory" error

**Diagnosis**:
1. Check Docker memory allocation: `docker info | grep Memory`
2. Review build logs for OOM killer

**Solutions**:
1. Increase Docker memory to 8GB minimum
2. Use `--no-cache` flag to reduce layer accumulation
3. Build with `DOCKER_BUILDKIT=1` for better memory management
```

Cover the failure modes you've actually seen — speculative troubleshooting
sections rot fast.

---

## Authoring checklist

Before finalizing a runbook, verify:

- [ ] YAML frontmatter has `name`, `type: runbook`, `version`, `description`,
      `tags`.
- [ ] Every phase has a clear **Goal** statement.
- [ ] Every check has **Command**, **Success**, and **On failure**.
- [ ] A cleanup phase exists with `<!-- cleanup-phase -->` and
      `<!-- run: always -->`.
- [ ] Background-task cleanup step included if parallel execution is used.
- [ ] Troubleshooting covers the failure modes you've actually seen.
- [ ] Timeouts (`<!-- timeout: -->`) specified for commands >30 seconds.
- [ ] Retry markers (`<!-- retry: N -->`) on genuinely flaky operations only.

---

## Related

- **`runbook-scaffold`** skill — creates the initial runbook stub. Use that
  first; use this skill to flesh out and refine.
- **`runbook-executor`** agent — runs the runbook this skill helps you
  author. Author with the executor's parser in mind.
