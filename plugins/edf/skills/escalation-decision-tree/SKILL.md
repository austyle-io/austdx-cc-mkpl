---
name: escalation-decision-tree
description: >
  Use when designing an escalation decision-tree, or when facing a decision
  whose stakes may require escalation: security vulnerabilities, breaking
  API changes, SLO impact, cross-team conflicts, or P0/P1 incidents.
  Provides the priority-level taxonomy (P0/P1/P2), automatic trigger
  catalog, and the escalate-with-recommendation rule. Pair with the
  `decision-protocol` skill for the human-input menu.
---

# Escalation Decision-Tree

A decision-tree pattern for deciding **when** to escalate, **to whom**, and
**how** to package the escalation so the person you escalate to can decide
quickly.

> **Under-escalation is dangerous.** Making decisions beyond your authority
> can create architectural debt, security exposure, or cross-team friction.
> When in doubt, escalate **with a recommendation** rather than deciding
> unilaterally — the recommendation is what makes the escalation cheap.

This skill documents the **structure** of an escalation decision-tree. It
does not prescribe a specific authority hierarchy; substitute your team's
actual roles for the generic ones used here.

## 1. Priority Taxonomy

Every escalation has a priority. The priority drives the routing rule and
the expected response time.

| Priority | Meaning | Response Target | Typical Examples |
| --- | --- | --- | --- |
| **P0** | Immediate — active harm or imminent risk | Minutes | Live security incident, production outage, data loss in progress |
| **P1** | Urgent — blocking work, time-sensitive | Same day | Breaking API change deadline, SLO breach trending, release-blocker |
| **P2** | Standard — planning, improvements, reversible | Days | Architectural choice with multiple valid paths, dependency upgrade strategy |

**Rule:** when unsure, escalate one level higher in priority, not lower.
Mis-priced P0/P1 issues lose hours of recovery time; mis-priced P2 issues
lose nothing.

## 2. Automatic Triggers

These categories **always** escalate, regardless of how confident the
current owner feels. They are the non-negotiable nodes of the tree.

| Trigger | Why It Auto-Escalates | Route To |
| --- | --- | --- |
| Security vulnerability | Asymmetric blast radius — one missed CVE costs more than 100 escalations | Security owner, then engineering lead |
| Breaking API change | Contract impact crosses team boundaries by definition | API/architecture owner |
| SLO impact (observed or projected) | Reliability authority sits above any single feature owner | Reliability/SRE owner |
| Cross-team conflict | Neither team can resolve unilaterally without precedent | Both teams' leads, jointly |
| Major dependency change | Long-tail risk, hard to roll back | Tech lead or architecture owner |
| Irreversible decision with high blast radius | One-way doors get an extra reviewer, always | Engineering lead → director |

## 3. Discretionary Triggers

These **may** warrant escalation depending on context. The tree branches
on reversibility and risk.

| Situation | Default Action |
| --- | --- |
| Multiple equally valid options, no clear winner | Escalate with a recommendation |
| Time-critical but within your authority | Decide, document, notify |
| Reversible, low-risk | Decide and proceed; ADR optional |
| Irreversible, low-risk | Decide, write an ADR |
| Reversible, high-risk | Escalate with a recommendation |
| Irreversible, high-risk | Always escalate, never decide alone |

## 4. The Escalate-With-Recommendation Rule

**Never escalate just a problem. Always escalate a problem plus a proposed
solution.**

A bare problem forces the decider to do the analysis you should have done.
A problem-plus-recommendation lets them either ratify in one minute or
push back specifically. This is the single highest-leverage rule in the
entire skill.

A complete escalation contains:

1. **Context** — what led to this point (one paragraph max).
2. **Decision needed** — the specific question, phrased as a yes/no or
   pick-one-of-N.
3. **Options** — typically 2–3, each with pros, cons, and risk.
4. **Your recommendation** — which option and why.
5. **Blocking status** — does work stop until this is decided, or can you
   proceed under an assumption?
6. **Urgency** — P0, P1, or P2 with the response window you need.

## 5. The Decision Tree

```text
Decision facing you
│
├── Hits an automatic trigger? (security / breaking API / SLO /
│   cross-team / major dep / irreversible-high-risk)
│   └── YES → escalate with recommendation (priority by trigger type)
│
└── NO → Is it within your authority?
    │
    ├── YES → Is it irreversible or high-risk?
    │   ├── YES → decide, write an ADR, notify peers
    │   └── NO  → decide and proceed
    │
    └── NO → Prepare the escalation packet (§4) and route by priority:
        ├── P0 → skip intermediate levels, page on-call channel
        ├── P1 → next authority level, same-day deadline stated
        └── P2 → normal escalation, continue parallel work
```

## 6. Routing by Priority

Substitute your team's actual roles for the generic names below.

### P0 — Immediate

- Page the on-call channel; do not wait for a chain of intermediate
  approvers.
- Route directly to the highest available decision-maker
  (engineering lead → director → on-call exec, as needed).
- Document **after** resolution, not before. Speed beats paperwork in P0.

### P1 — Urgent

- Escalate to the next authority level (team lead → engineering lead).
- State the response window explicitly ("need a decision by 4pm today").
- Continue parallel work that is not blocked.

### P2 — Standard

- Follow the normal escalation chain.
- Allow a reasonable response window (days, not hours).
- Always continue parallel work.

## 7. Anti-Patterns

**Under-escalation**

- Making decisions beyond your authority because escalation feels like
  weakness.
- "It's probably fine" — when the cost of being wrong dwarfs the cost of
  asking, always ask.
- Avoiding escalation to appear self-sufficient. Self-sufficient is good;
  silently absorbing org-level risk is not.

**Over-escalation**

- Escalating every decision instead of building judgment.
- Escalating without a recommendation. (See §4 — this is the cardinal
  sin.)
- Escalating before doing the homework. The decider should not be doing
  your reading for you.

**Poor escalation packets**

- Vague problem, no options.
- No urgency stated, so the decider can't prioritize against their other
  inputs.
- Unclear blocking status — the decider can't tell if you're stuck or
  asking for ratification.

## 8. After Resolution

1. Record the decision: who decided, what they chose, when.
2. Capture the rationale in the team's decision log or ADR.
3. Note the precedent so future similar cases route faster.
4. If the decision changed architecture or interfaces, write or update
   the ADR.

## 9. Companion Skill

For the **human-input menu** — the structured options you present when
the escalation hits the human decision-maker — pair this skill with the
`decision-protocol` skill in this plugin. This tree decides *whether and
to whom* to escalate; `decision-protocol` decides *how to phrase the ask*
once you're escalating.
