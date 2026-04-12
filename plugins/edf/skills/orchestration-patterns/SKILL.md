---
name: orchestration-patterns
description: >
  Use when choosing between a runbook, decision tree, checklist, or workflow,
  or before authoring any orchestration document. Triggers include "should
  this be a runbook or a workflow", "how do I structure this procedure",
  "what's the right format for these checks", "is this a checklist or a
  runbook". Provides the 4-structure framework with selection criteria,
  composition patterns (runbooks embed decision-trees; workflows gate on
  checklists), and anti-patterns. Companion to `runbook-authoring` and
  `edf-authoring`.
---

<!-- @layer:1 -->

# Orchestration Patterns

The EDF library exposes four orchestration structures. Each has a single
purpose. Picking the right one is the first design decision; mixing them
correctly is the second.

| Structure | Purpose | Shape |
| --- | --- | --- |
| **Runbook** | EXECUTION | Linear, ordered phases with explicit cleanup |
| **Decision Tree** | ROUTING | Branching gates that resolve to terminal outcomes |
| **Checklist** | VERIFICATION | Unordered set of pass/fail criteria |
| **Workflow** | DECLARATIVE EXECUTION | DAG of nodes with edges, gates, and parallel branches |

Read this skill before authoring any orchestration document. The companion
skill `runbook-authoring` covers runbook-specific syntax; `edf-authoring`
covers the schema validation rules.

---

## When to Use Each Structure

### Runbook — multi-phase execution with cleanup

Choose a runbook when:

- The work has a natural linear order (phase 1 must finish before phase 2).
- Each phase produces an artifact or side effect the next phase consumes.
- Failures need explicit rollback or cleanup phases.
- A human or agent must be able to stop, resume, or audit progress.

A runbook is the right home for migrations, deployments, incident response,
and any procedure where "what was the state when it failed" matters.

### Decision Tree — binary or n-ary routing

Choose a decision tree when:

- A question has a finite set of answers, each leading to a different path.
- The output of the tree is a *choice* (which procedure, which agent, which
  configuration), not the execution of that choice.
- Gates can be evaluated quickly without producing artifacts.

Trees terminate. They do not loop. If you need iteration, the tree's
terminal points at a runbook that loops.

### Checklist — parallel verification

Choose a checklist when:

- You need to verify a set of independent conditions hold.
- Order does not matter — items can be checked in any sequence or in
  parallel.
- The outcome is "all pass" or "list of failures", not a routing decision.

Checklists are the right tool for release readiness, security review gates,
pre-flight checks, and any "did we do all the things" question.

### Workflow — declarative DAG

Choose a workflow when:

- The procedure has parallel branches that converge.
- Gates between nodes evaluate complex conditions (often checklists).
- The structure benefits from being machine-parseable and visualizable.
- You need fan-out and fan-in patterns a linear runbook cannot express.

A workflow is a runbook generalized to a DAG. If your runbook keeps wanting
to express "do A and B in parallel then merge", promote it to a workflow.

---

## Selection Decision Tree

```text
Is the output a routing choice?
├─ YES → Decision Tree
└─ NO  → Is the work a set of independent checks?
         ├─ YES → Checklist
         └─ NO  → Does the work fan out and back in?
                  ├─ YES → Workflow
                  └─ NO  → Runbook
```

If the answer feels like "kind of both", you probably need a composition,
not a hybrid single document.

---

## Composition Patterns

The four structures compose. The library expects this — most non-trivial
procedures embed at least one structure inside another.

### Pattern 1: Runbook embeds Decision Tree

A runbook phase that must pick between paths references a decision tree.
The tree resolves to a terminal that names the next phase or sub-runbook.

```markdown
## Phase 3: Select Migration Strategy

Evaluate decision tree `migration-strategy.tree.yaml`.

- Terminal `in-place` → continue to Phase 4a
- Terminal `blue-green` → continue to Phase 4b
- Terminal `abort` → jump to cleanup phase
```

Use when a runbook has a single branching point that fans back in. Keep the
tree small (≤ 3 gate levels). If the tree gets bigger, the runbook should
probably be a workflow.

### Pattern 2: Workflow gates on Checklist

A workflow gate (the edge condition between two nodes) evaluates a
checklist. The gate passes only when every checklist item passes.

```yaml
nodes:
  - id: build
  - id: deploy
edges:
  - from: build
    to: deploy
    gate:
      type: checklist
      ref: pre-deploy-readiness.checklist.yaml
      require: all-pass
```

Use when a workflow transition needs multi-criteria validation. The
checklist stays a separate document so it can be reused across workflows.

### Pattern 3: Runbook ends with Checklist

The final phase of a runbook runs a verification checklist. Failures route
back to the relevant earlier phase or to a cleanup phase.

Use for any runbook where "are we done?" is a multi-criteria question.
Standard for deployment runbooks, refactor runbooks, and migration
runbooks.

### Pattern 4: Decision Tree terminals point at Runbooks

Each terminal of a decision tree references the runbook to execute next.
The tree is pure routing; the runbooks do the work.

```yaml
terminals:
  - id: needs-rollback
    action: execute runbook `rollback-deploy.runbook.md`
  - id: needs-hotfix
    action: execute runbook `hotfix-release.runbook.md`
```

Use when the same question routes between several distinct procedures.
Keeps each runbook focused on one execution path.

### Pattern 5: Workflow node delegates to Runbook

A node inside a workflow is implemented by a runbook. The workflow handles
the DAG shape; the runbook handles the linear execution of one branch.

Use when a workflow has a node whose internal steps are themselves a
multi-phase procedure with cleanup requirements.

---

## Anti-Patterns

**Nested runbooks.** A runbook calling a runbook inline (not as a clean
hand-off) hides control flow. Flatten into a single runbook with more
phases, or promote to a workflow.

**Deep decision trees.** A tree with more than three gate levels is hard
to audit and almost always means the gates are evaluating things that
should be a checklist. Gather signals with a checklist, then route on the
result.

**Checklist with conditionals.** If a checklist item reads "if X then check
Y else check Z", that is a decision tree wearing a checklist costume. Split
it: a decision tree selects the right checklist.

**Standalone workflow.** A workflow document not referenced by any agent,
runbook, or command is dead weight. Workflows must be invoked from a host
context.

**Runbook without cleanup.** Every runbook that touches state needs an
explicit rollback/cleanup phase. Procedures that "can't fail" still get
interrupted. No exceptions for production-touching runbooks.

**Decision tree with side effects.** Gates evaluate; terminals act. A gate
that mutates state breaks the audit trail and makes the tree non-replayable.

**Mixing routing and execution in one document.** If you find yourself
writing "if condition then do these five steps" inside a decision tree, you
have a runbook in disguise. Split it.

---

## Right-Sizing

| Signal | Structure |
| --- | --- |
| Single ordered procedure, < 10 phases | Runbook |
| 1-3 levels of routing, no execution | Decision Tree |
| Flat set of independent checks | Checklist |
| Parallel branches, complex gates | Workflow |
| Procedure with one branch point | Runbook + embedded Decision Tree |
| Procedure with multi-criteria gate | Runbook + embedded Checklist |
| Several procedures sharing a router | Decision Tree → Runbooks |
| Pipeline with fan-out/fan-in | Workflow + Runbook nodes |

When in doubt, start with the simpler structure (runbook or checklist) and
promote to a workflow only when the linear form starts fighting you.

---

## Authoring Checklist

Before publishing any orchestration document:

- [ ] Exactly one structure type per document. No hybrids.
- [ ] Purpose stated in the first paragraph matches the structure chosen.
- [ ] If it touches state, cleanup or rollback path is explicit.
- [ ] References to other structures use file paths, not inline copies.
- [ ] Terminal/exit conditions are enumerated and unambiguous.
- [ ] Document validates against the EDF schema for its type.
- [ ] Companion `edf-authoring` skill applied for schema compliance.
- [ ] Companion `runbook-authoring` skill applied if this is a runbook.

If any box is unchecked, the document is a draft. Treat shipping it as
shipping unverified code.
