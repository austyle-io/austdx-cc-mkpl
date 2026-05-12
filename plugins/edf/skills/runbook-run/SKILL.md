---
name: runbook-run
description: >
  Use when a user wants to execute a runbook — "run runbook X", "execute
  the catalog-validation runbook", "launch deployment workflow", "start
  integration test", "kick off the release checklist". Dispatches the
  `runbook-executor` agent, which parses phases, tracks background tasks,
  handles retries, and guarantees cleanup execution. For pre-flight
  assessment before running, use the `runbook-preflight` skill instead.
---

# Runbook Run

Execution surface for runbooks. When a user wants to actually run a
multi-phase workflow defined in a runbook file, this skill hands the
request to the `runbook-executor` agent and relays the resulting
execution report back.

This skill **does execute** runbooks. For pre-flight assessment without
execution, see the `runbook-preflight` skill (which dispatches
`runbook-strategist`).

---

## When to invoke

Invoke `runbook-executor` via this skill when the user signals any of:

- **Direct run requests** — "run runbook X", "execute X", "launch X",
  "kick off X", "start the X workflow".
- **Named runbook references** — "run the catalog-validation runbook",
  "execute the docker-backend-integration runbook", "launch the
  deployment workflow".
- **Workflow execution** — "start integration test", "run the pre-release
  checklist", "execute the migration steps".
- **Cleanup-critical operations** — anything where the user wants
  guaranteed cleanup even after failure ("run integration tests and make
  sure cleanup happens").

Do **not** invoke for:

- **Pre-flight questions** — "is X ready", "what could go wrong with X",
  "should I run X". Hand off to `runbook-preflight`.
- **Authoring** — "write a runbook", "edit this runbook". Hand off to
  `runbook-authoring`.
- **Scaffolding** — "create a new runbook from scratch". Hand off to
  `runbook-scaffold`.

---

## Hand-off pattern

1. **Locate the runbook.** If the user gave a name, search standard
   locations in this order:

   1. `.agents/runbooks/{name}.md`
   2. `.agents/runbooks/**/{name}.md`
   3. `**/runbooks/{name}.md`

   ```bash
   rg --files -g "**/runbooks/${name}.md" -g "**/runbooks/**/${name}.md" 2>/dev/null | head -1
   ```

   If the user gave a path, use it directly. If nothing matches, list
   available runbooks and ask the user to disambiguate before dispatching:

   ```bash
   rg --files -g "**/runbooks/*.md" 2>/dev/null | grep -v README
   ```

2. **Dispatch `runbook-executor`** via the Agent tool (`Task` is the legacy alias). Pass the runbook
   path and the execution protocol expectations:

   ```text
   Execute the runbook at {runbook-path}. Follow the runbook-executor
   protocol:

   1. Parse the runbook structure (YAML frontmatter + phase markdown)
   2. Create an execution plan with TodoWrite to track phase progress
   3. Execute phases in declared order, respecting dependencies
   4. Track all background tasks by bash_id throughout execution
   5. Handle failures via remediation blocks and retry markers
   6. Always execute the cleanup phase, regardless of outcome
   7. Produce the final structured execution report
   ```

3. **Relay the execution report.** The executor returns a structured
   summary. Present it to the user with minimal framing — phase results,
   check statistics, and background task accounting are all load-bearing
   for the user's next decision.

4. **Suggest a next action** based on overall status:

   | Status | Next action |
   | --- | --- |
   | **SUCCESS** | Confirm completion. Surface any warnings encountered. |
   | **PARTIAL** | Highlight which phases failed and which were skipped. Offer remediation. |
   | **FAILED** | Surface failed checks with captured output. Suggest investigation or `runbook-preflight` for a follow-up assessment. |

---

## Expected input

- **Runbook reference** — name (e.g. `docker-backend-integration`) or
  full path (e.g. `.agents/runbooks/deployment-validation.md`).
- **Optional context** — concerns the user wants the executor to be
  aware of, environment specifics, or known-flaky areas. Pass these
  through verbatim.

---

## Expected output

The executor returns an execution summary with these sections:

- **Header** — runbook name, version, overall status, duration.
- **Phases** — per-phase result (PASS / FAIL / SKIP) with duration.
- **Summary** — total checks, passed, failed, skipped.
- **Background Tasks** — spawned, completed, terminated counts.

The skill's job is to **relay this report faithfully**. Do not collapse
per-phase detail; the user needs that surface to triage failures or
plan follow-up runs.

---

## What this skill does not do

- **Does not assess feasibility.** Use `runbook-preflight` (which
  dispatches `runbook-strategist`) for pre-flight risk and readiness
  analysis.
- **Does not modify the runbook.** Use `runbook-authoring` for edits.
- **Does not create new runbooks.** Use `runbook-scaffold` for
  scaffolding.
- **Does not skip cleanup.** The cleanup phase is guaranteed by the
  executor; this skill must not request a "no-cleanup" variant.

---

## Quick reference

| User says | Skill does |
| --- | --- |
| "Run the `docker-backend-integration` runbook" | Locate runbook, dispatch executor, relay report. |
| "Execute `.agents/runbooks/deployment-validation.md`" | Path given directly — dispatch executor immediately. |
| "Launch the catalog-validation workflow" | Resolve `catalog-validation` to a runbook path, dispatch executor. |
| "Start the integration test runbook" | Locate runbook, dispatch executor, relay report. |
| "Is the deploy runbook safe to run?" | **Wrong skill** — hand off to `runbook-preflight`. |
| "Write a new release runbook" | **Wrong skill** — hand off to `runbook-authoring`. |

---

## Error handling

- **Runbook not found** — list candidate runbooks and ask the user to
  disambiguate. Do not guess; the executor requires a concrete path.
- **Malformed runbook** — the executor will report a parse error before
  attempting execution. Relay the error and offer to hand off to
  `runbook-authoring` for correction.
- **Mid-execution failure** — the executor will continue through
  independent phases and always run cleanup. The final report names
  the failed phase(s) and any skipped dependents.
- **Orphaned background tasks** — the executor tracks every task by
  `bash_id` and terminates them during cleanup. If a task is reported
  as still running after cleanup, surface it explicitly so the user
  can investigate.
