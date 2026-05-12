---
name: skeptical-review-pattern
description: >
  Use when evaluating a claim, plan, design, or proposal that warrants
  critical scrutiny — checking for unstated assumptions, missing evidence,
  alternative interpretations, or "what could go wrong". Provides the
  structured-skepticism decision-tree pattern, the evidence-vs-assertion
  rule, and the alternative-interpretation prompt. Pair with
  `decision-protocol` when skepticism surfaces a need for human input.
---

# Skeptical Review Pattern

A structured pattern for critical evaluation of claims, plans, designs, or
proposals. Use it whenever something is presented as true, decided, or done
and you need to verify rather than accept.

The pattern enforces three core moves:

1. Demand **evidence** in place of assertion.
2. Surface **unstated assumptions**.
3. Generate **alternative interpretations** before accepting one.

Skepticism is not refusal. The goal is to reach a conclusion you can
defend — including the conclusion "this is fine".

## When to apply

Apply the full pattern when any of these are true:

- A claim is load-bearing for a decision (architecture, security, deploy).
- The source is external (docs, search results, third-party blog, AI output).
- The information is older than ~30 days or has no date.
- The claim contradicts the codebase, the spec, or a prior decision.
- You feel mild discomfort but cannot yet name why.

Skip the full pattern (a quick sanity check is enough) when:

- The claim is trivially verifiable (running the code answers it).
- The decision is cheap and reversible.
- You have first-party evidence already in front of you.

## The decision tree

```
                          ┌───────────────────────┐
                          │ Claim / plan received │
                          └──────────┬────────────┘
                                     │
                  ┌──────────────────▼──────────────────┐
                  │ Q1. Is there evidence, or only      │
                  │     assertion?                      │
                  └──────────┬──────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
           assertion only             evidence cited
                │                         │
                ▼                         ▼
        request evidence       ┌──────────────────────────┐
        or run a check         │ Q2. Is the evidence      │
                │              │     first-party, fresh,  │
                │              │     and on-point?        │
                │              └──────────┬───────────────┘
                │                         │
                │              ┌──────────┴──────────┐
                │              │                     │
                │           weak/stale            strong
                │              │                     │
                │              ▼                     ▼
                │      treat as tentative   ┌────────────────────────┐
                │      and corroborate      │ Q3. What assumptions   │
                │              │            │     does this rest on? │
                │              │            └──────────┬─────────────┘
                │              │                       │
                │              │              ┌────────┴────────┐
                │              │              │                 │
                │              │     assumptions unstated  all surfaced
                │              │              │                 │
                │              │              ▼                 ▼
                │              │      list and test    ┌────────────────────┐
                │              │      assumptions      │ Q4. What is an     │
                │              │              │        │     alternative    │
                │              │              │        │     interpretation?│
                │              │              │        └─────────┬──────────┘
                │              │              │                  │
                │              │              │       ┌──────────┴─────────┐
                │              │              │       │                    │
                │              │              │   plausible alt        none found
                │              │              │   exists                  │
                │              │              │       │                    │
                │              │              │       ▼                    ▼
                │              │              │  compare and        ┌─────────────────┐
                │              │              │  pick deliberately  │ Q5. What would  │
                │              │              │       │             │     have to be  │
                │              │              │       │             │     true for    │
                │              │              │       │             │     this to     │
                │              │              │       │             │     be wrong?   │
                │              │              │       │             └────────┬────────┘
                │              │              │       │                      │
                │              │              │       │           ┌──────────┴──────────┐
                │              │              │       │           │                     │
                │              │              │       │     check is cheap        check is costly
                │              │              │       │           │                     │
                │              │              │       │           ▼                     ▼
                │              │              │       │     run the check       record the risk;
                │              │              │       │           │             escalate if it
                │              │              │       │           │             matters
                └──────────────┴──────────────┴───────┴───────────┴─────────────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │  Accept,    │
                                       │  defer, or  │
                                       │  reject     │
                                       └─────────────┘
```

The tree terminates in one of three states:

- **Accept** — evidence is sufficient, alternatives considered, residual
  risk understood and acceptable.
- **Defer** — not enough information yet; record what is missing and what
  would resolve it.
- **Reject** — evidence is weak, assumptions fail, or a better
  interpretation fits.

## Q1. Evidence vs assertion

The single most useful question: *what would I have to observe to know
this is true?*

| Form                          | Treat as            |
| ----------------------------- | ------------------- |
| "X is the case."              | assertion           |
| "X is the case, per [link]."  | cited assertion     |
| "I ran X and got Y."          | first-party evidence|
| "Here is the failing test."   | first-party evidence|

Cited assertions are better than bare assertions but still inherit the
source's reliability. First-party evidence — output you produced or can
reproduce now — outranks both.

Rule of thumb: if the claim is load-bearing and only an assertion exists,
either produce evidence or downgrade the claim to "hypothesis" until
evidence arrives.

## Q2. Evidence quality

Once evidence exists, grade it before relying on it:

- **First-party** (run now) > **first-party** (run earlier this session) >
  **third-party recent** > **third-party old** > **unknown vintage**.
- Does the evidence answer *this* question, or a neighbouring question?
  Beware near-misses dressed up as proofs.
- Was the test done against the actual system, or a mock or stub?
- For library/API claims, prefer official docs queried now over training
  recall.

When evidence is third-party or older than ~30 days, corroborate with a
second independent source before treating the claim as confirmed.

## Q3. Surfacing assumptions

Most failures live in unstated assumptions, not in the visible argument.
Make them visible by asking:

- What must be true about the **inputs** for this to hold?
- What must be true about the **environment** (versions, OS, network,
  permissions)?
- What must be true about the **users** or callers?
- What must be true about **timing** (cold start, warm cache, race
  conditions)?
- What must be true about **scale** (volume, concurrency, size)?

For each assumption, mark its status:

- **known-true** — verified.
- **likely-true** — plausible but not checked.
- **unknown** — has not been considered until now.
- **known-false** — contradicted by evidence; the plan must change.

An assumption ledger is cheap insurance; it also makes review possible.

## Q4. Alternative interpretations

Before accepting an explanation, generate at least one alternative that
is consistent with the same evidence. Useful framings:

- **Null-hypothesis framing:** what if the effect isn't real / the bug
  isn't where it looks?
- **Selection-effect framing:** is the evidence the result of how we
  looked, not of what is true?
- **Reversed-causation framing:** could B cause A instead of A cause B?
- **Same-symptom-different-cause framing:** what else produces this
  signature?

If an alternative is plausible, do not pick the first interpretation by
default. Compare them on evidence, cost-to-verify, and blast radius if
wrong.

If no alternative survives, that itself is a stronger argument for the
original than no comparison at all.

## Q5. "What would have to be true for this to be wrong?"

This is the pre-mortem question. Make it explicit:

- Name the smallest fact that, if true, would invalidate the conclusion.
- Estimate the cost of checking that fact.
- If cheap, check it. If costly, record it as a residual risk and decide
  whether to escalate.

This step is where over-confidence usually dies. A plan that *cannot* be
wrong has not been examined hard enough.

## Anti-patterns

- **Performative skepticism** — listing concerns without resolving any of
  them. Skepticism that never terminates is theatre.
- **Demanding evidence selectively** — applying the pattern only to
  claims you dislike. Apply it symmetrically, including to your own.
- **Stacking caveats instead of deciding** — "it might be X, or Y, or Z"
  with no commitment. The pattern ends in *accept, defer, or reject*.
- **Confusing confidence with truth** — a confident source is not a
  verified source. Tone is not evidence.
- **Skipping straight to alternatives** — if the original claim has no
  evidence, generating alternatives is premature; demand evidence first.
- **Treating staleness as fatal** — old information can still be correct.
  Stale = needs corroboration, not automatic rejection.

## Output shape

When this pattern is used to evaluate something explicitly, the result
should be expressible as:

```
Claim:        <one sentence>
Evidence:     <first-party / cited / none>  — <strong/weak/stale>
Assumptions:  <bulleted, with status>
Alternatives: <bulleted, with why-not for each>
Residual risk:<what would have to be true for this to be wrong>
Verdict:      accept | defer | reject
Next step:    <if defer or reject>
```

A short verdict block of this shape is enough for most reviews; the full
tree is for cases where the answer is not obvious.

## Pair with

- `decision-protocol` — when Q5 surfaces a residual risk that needs a
  human call rather than a unilateral decision.
- `iterative-refinement` — when "defer" is the verdict and the next step
  is another loop of investigation.
