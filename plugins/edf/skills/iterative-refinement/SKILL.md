---
name: iterative-refinement
description: >
  Use when running a refinement loop on a plan, design, document, or analysis
  — converging on quality through iteration with confidence scoring. Provides
  the refine/evaluate/decide loop, confidence threshold conventions (>=85% to
  ship), diminishing-returns stop conditions, and the "stalled confidence"
  escalation path. Common pairings: `decision-protocol` (for stop/ship calls)
  and `escalation-decision-tree` (when refinement is blocked).
---

# Iterative Refinement

A foundational pattern for converging on quality through repeated cycles of revision and evaluation. Apply to plans, designs, documents, analyses, or any artifact where "good enough" is not yet defined and needs to be discovered through iteration.

## The Loop

```text
+----------------------------------------------------+
|                                                    |
|   REFINE -> EVALUATE -> DECIDE                     |
|     ^                     |                        |
|     |                     |                        |
|     +-------- CONTINUE ---+                        |
|                  or                                |
|            STOP -> SHIP / ESCALATE                 |
|                                                    |
+----------------------------------------------------+
```

Each cycle:
1. **Refine** — apply targeted improvements to the artifact
2. **Evaluate** — score current confidence (0-100%)
3. **Decide** — continue, ship, or escalate based on stop conditions

## Confidence Scoring

Score on a 0-100 scale, banded for clarity:

| Band | Range | Meaning | Typical Action |
| --- | --- | --- | --- |
| **VERY_HIGH** | 90-100% | Comprehensive, well-supported | Ship immediately |
| **HIGH** | 75-89%  | Solid with minor gaps | Ship with monitoring |
| **MEDIUM** | 50-74% | Needs improvement | Continue refinement |
| **LOW** | 0-49% | Significant issues | Major revision |

**Threshold conventions:**
- `>= 85%` — default ship threshold. Below this you keep refining.
- `>= 90%` — high-stakes artifacts (production designs, customer-facing docs).
- `>= 75%` — internal/exploratory artifacts where speed beats polish.

Pick the threshold *up front* and write it down. Retroactively lowering the bar to claim victory is a tell that the work isn't ready.

## Stop Conditions

Stop the loop when one of these fires, in priority order:

```yaml
stop_conditions:
  goal_achieved:
    when: confidence >= target
    outcome: SHIP
    priority: 1

  iteration_budget_exhausted:
    when: iterations >= max_iterations
    outcome: SHIP_BEST_AVAILABLE  # or escalate if below floor
    priority: 2

  diminishing_returns:
    when: last_two_deltas < 5%
    outcome: SHIP_OR_ESCALATE
    priority: 3

  unresolvable_blocker:
    when: same blocker persists 2+ iterations
    outcome: ESCALATE
    priority: 4
```

### Diminishing Returns

Track the confidence delta between iterations:

```text
Iter 1: 58% (baseline)
Iter 2: 72% (+14)  -- strong gain
Iter 3: 81% (+9)   -- moderate gain
Iter 4: 84% (+3)   -- low gain (warning)
Iter 5: 86% (+2)   -- low gain (PLATEAU)
```

Two consecutive iterations with delta < 5% means further investment is unlikely to pay. Either ship at the current level or change approach — do not keep grinding.

| Delta | Interpretation | Action |
| --- | --- | --- |
| > 15% | Strong returns | Continue |
| 5-15% | Moderate returns | Continue |
| < 5% | Diminishing | Evaluate stop |
| Negative | Regression | Investigate cause |
| Zero, repeated | Stagnation | Change tactic |

## Stalled Confidence

When confidence plateaus *below* the ship threshold, you have a stall. Three patterns to distinguish:

```yaml
temporary_stall:
  pattern: "One low-delta iteration, then recovery"
  cause: "Bad targeting, hard problem"
  action: "Continue with adjusted focus"

true_plateau:
  pattern: "Two or more consecutive low-delta iterations near threshold"
  cause: "Fundamental ceiling reached"
  action: "Ship best available OR escalate"

false_plateau:
  pattern: "Low delta but blockers still open"
  cause: "Refining the wrong things"
  action: "Re-target — address blockers explicitly"
```

When you hit a true plateau below threshold, you have two paths:

1. **Ship the best available** — if the gap is small and downstream consumers can compensate, ship with a clear "known gaps" note.
2. **Escalate** — if the gap blocks the next step, surface the blocker to a human or higher-level decision-maker. See the companion `escalation-decision-tree` skill for how to package the escalation.

Decide which path to take using the `decision-protocol` skill — frame it as a forced choice with explicit tradeoffs rather than letting the loop drift.

## Targeting Each Refinement

A refinement iteration without a target is wasted budget. Before each cycle, ask:

- **What** is the lowest-confidence dimension? (research, validation, scope, clarity, etc.)
- **Why** is it low — missing information, unverified assumption, vague requirement?
- **How** will this iteration address it — specific change, not "make it better"?

Cluster related issues into a single iteration where possible. Fixing four research gaps in one pass beats four iterations each fixing one.

## Iteration Budget

Set a budget before starting. Defaults:

| Task complexity | Max iterations |
| --- | --- |
| Simple | 3 |
| Medium | 5 |
| Complex | 7 |
| Very complex / open-ended | 10 |

Budgets are a forcing function. If you blow through your budget without hitting threshold, that's data — stop and reassess approach rather than mechanically continuing.

## Tracking Trajectory

Record each iteration. Minimum schema:

```yaml
iteration:
  number: 3
  confidence: 81
  delta: 9
  focus: "tightening scope, removing stretch goals"
  open_blockers: 2
  decision: continue
```

A visible trajectory makes plateau detection automatic and gives you the data to escalate credibly when needed.

## Common Pitfalls

- **Vanity refinement** — polishing high-confidence sections instead of attacking the low-confidence ones. Always target the weakest dimension.
- **Threshold creep** — lowering the bar mid-loop to declare victory. Set the threshold first, write it down, defend it.
- **Infinite loop** — refining past diminishing returns because "almost there." Trust the data. Two sub-5% deltas means stop.
- **No trajectory** — running the loop without recording confidence per iteration. You cannot detect a plateau you did not measure.
- **Hidden stall** — confidence stays flat but you keep iterating without changing tactic. Either change approach or escalate.
- **Skipping evaluate** — refining without re-scoring is just churn. Every iteration ends with a fresh confidence number.

## Companion Skills

- `decision-protocol` — for the stop/ship/escalate call when confidence plateaus or budget runs out
- `escalation-decision-tree` — for packaging and routing the escalation when refinement is blocked
