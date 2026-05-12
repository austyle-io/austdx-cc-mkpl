---
name: runbook-preflight
description: >
  Use when a user wants pre-flight assessment of a runbook before execution —
  checking prerequisites, identifying risks, and recommending an execution
  approach without actually running it. Triggers include "assess this
  runbook", "check before running", "preflight", "is this runbook ready",
  "what could go wrong", "should I launch X". Delegates the actual
  assessment to the `runbook-strategist` agent. Distinct from
  `runbook-run`, which is the surface for actually running a runbook
  via `runbook-executor`.
---

# Runbook Preflight

Pre-flight assessment surface for runbooks. When a user wants to know whether
a runbook is safe to launch — what its prerequisites are, what risks it
carries, and how it should be executed — this skill hands the request to
the `runbook-strategist` agent and relays the resulting assessment back.

This skill **does not execute** runbooks. For execution, see the
`runbook-run` skill (which dispatches `runbook-executor`).

---

## When to invoke

Invoke `runbook-strategist` via this skill when the user signals any of:

- **Direct assessment requests** — "assess X", "preflight X", "review X
  before I launch", "check if X is ready".
- **Risk questions** — "what could go wrong with X", "what are the risks
  of running X", "is X safe to run".
- **First-time execution** — user is running a runbook they've never run,
  or one they haven't run in a while.
- **Complex runbooks** — many phases, parallel blocks, specialist
  delegations, or `complexity: high` in the runbook frontmatter.
- **High-stakes operations** — deployments, migrations, destructive
  cleanups, anything touching production.
- **Recovery from failure** — runbook failed previously and user wants
  to understand whether the underlying conditions have changed.

Do **not** invoke for casual "what does this runbook do?" — that's a Read,
not a strategist dispatch. The strategist is for execution-readiness, not
documentation comprehension.

---

## Hand-off pattern

1. **Locate the runbook.** If the user gave a name, search standard
   locations:

   ```bash
   rg --files -g "**/runbooks/${name}.md" -g "**/runbooks/**/${name}.md" 2>/dev/null | head -1
   ```

   If the user gave a path, use it directly. If nothing matches, ask the
   user to disambiguate before dispatching — the strategist needs a
   concrete runbook path.

2. **Dispatch `runbook-strategist`** via the Task tool. Pass the runbook
   path and a clear instruction to produce a full strategic assessment:

   ```text
   Analyze the runbook at {runbook-path} and produce a strategic
   pre-flight assessment. Cover:

   1. Runbook structure (phases, checks, dependencies)
   2. Environment reconnaissance (verify prerequisites against current
      state — do not guess)
   3. Risk assessment (per-phase risk levels and failure modes)
   4. Execution strategy (recommended order, parallelism, checkpoints)
   5. Delegation map (which specialist agents this runbook calls)
   6. Historical context (prior executions, if available in memory)
   7. Recommendation (PROCEED / PROCEED WITH CAUTION / DEFER / ABORT)
   ```

3. **Relay the assessment.** The strategist returns a structured report.
   Present it to the user verbatim (or with minimal framing) — do not
   summarize away the per-phase detail; the user needs that to make the
   go/no-go call.

4. **Suggest a next action** based on the recommendation:

   | Recommendation | Next action |
   | --- | --- |
   | **PROCEED** | User can dispatch `runbook-executor` to launch. |
   | **PROCEED WITH CAUTION** | Surface the warnings, confirm user has read them, then launch. |
   | **DEFER** | Identify blockers and propose how to resolve them. |
   | **ABORT** | Do not launch. Explain the critical issue. |

---

## Expected input

- **Runbook reference** — name (e.g. `docker-backend-integration`) or path
  (e.g. `.agents/runbooks/deployment-validation.md`).
- **Optional context** — recent changes to the environment, prior failures
  the user remembers, or specific concerns ("I'm worried about the
  database migration step").

Pass any user-provided context to the strategist along with the runbook
path so it can focus its reconnaissance.

---

## Expected output

The strategist returns a Strategic Assessment with these sections:

- **Executive Summary** — one-paragraph overview.
- **Prerequisites Status** — per-prerequisite ready/not-ready.
- **Risk Assessment** — per-phase risk level with failure modes.
- **Execution Strategy** — recommended approach and ordering.
- **Delegation Map** — specialists this runbook will invoke.
- **Historical Context** — relevant prior runs (if any).
- **Recommendation** — explicit go/no-go.

The skill's job is to **relay this report faithfully**, not to second-guess
or compress it. The user is making a decision; they need the full surface.

---

## What this skill does not do

- **Does not execute the runbook.** Use the `runbook-run` skill
  (dispatches `runbook-executor`) for that.
- **Does not modify the runbook.** Use the `runbook-authoring` skill for
  edits.
- **Does not create new runbooks.** Use the `runbook-scaffold` skill for
  that.
- **Does not skip reconnaissance.** If the strategist cannot verify
  environment state, the assessment must say so explicitly — never assume
  prerequisites are met.

---

## Quick reference

| User says | Skill does |
| --- | --- |
| "Is `release-checklist` ready to run?" | Locate runbook, dispatch strategist, relay assessment. |
| "What could go wrong with this deploy runbook?" | Dispatch strategist with focus on risk assessment. |
| "Assess `.agents/runbooks/migration-v2.md`" | Path given directly — dispatch strategist immediately. |
| "Run the deploy runbook" | **Wrong skill** — hand off to `runbook-run`. |
| "Help me write a new runbook" | **Wrong skill** — hand off to `runbook-authoring`. |
