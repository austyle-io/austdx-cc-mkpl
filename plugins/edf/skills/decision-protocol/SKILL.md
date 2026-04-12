---
name: decision-protocol
description: >
  Use when facing a decision moment that needs human input — irreversible
  actions, architectural choices with multiple valid approaches,
  security-sensitive changes, breaking API or schema changes, value
  trade-offs, or any time confidence in the autonomous path is below
  roughly 80%. Provides the 6-option pause menu (Approve, Modify,
  Explore, Review, Defer, Reject), the pause triggers that demand human
  confirmation, interaction patterns for options selection, review and
  approve, exploration, confidence checks, batched related decisions,
  and escalation, plus the decision-record format for documenting the
  call. Skip for low-stakes, clearly-reversible operations where the
  right answer is obvious and recoverable.
---

<!-- @layer:1 -->

# Decision Protocol

When you encounter a situation requiring human decision-making, use this
standardized protocol to pause and interact instead of guessing.

## When to Pause

NEVER proceed with irreversible actions without human confirmation. When in
doubt, pause and present options.

Pause and ask before:

- **Architectural decisions** with multiple valid approaches
- **Security-impacting changes** that could introduce vulnerabilities
- **Breaking changes** to APIs, schemas, or interfaces
- **Trade-offs** where one value is sacrificed for another
- **Uncertainty** when you're not confident in your recommendation
- **Irreversible actions** that cannot be easily undone
- **Cross-team impact** that affects work outside the current scope

**Confidence threshold**: proceed autonomously only when confidence in the
recommended path is roughly 80% or higher. Below that, surface the decision.

## Standard Interaction Menu

Present decisions in this format:

```text
DECISION POINT: [Brief 5-10 word title]

**Context**: [1-2 sentences explaining what triggered this decision]

**My Recommendation**: [Option X] because [1 sentence reasoning]

**How would you like to proceed?**
1. Approve - Accept recommendation and continue
2. Modify - Adjust the approach (tell me how)
3. Explore - Investigate alternatives before deciding
4. Review Details - Show me deeper analysis first
5. Defer - Flag for later, continue with other work
6. Reject - Don't do this, explain why

[Select 1-6 or provide custom direction]
```

## Interaction Patterns

### Options Selection

Use when multiple valid approaches exist:

```text
DECISION POINT: Authentication method selection

**Context**: Need to add authentication to the API endpoint.

**Options**:
A. OAuth 2.0 - Industry standard, complex setup
B. JWT - Simple, stateless, good for APIs
C. API Keys - Simplest, limited features
D. Session-based - Traditional, requires state

**My Recommendation**: B (JWT) because it's stateless and works well
with your microservices architecture.
```

### Review & Approve

Use when you have a clear recommendation:

```text
DECISION POINT: Database index strategy

**Context**: Query performance is degrading on the users table.

**My Recommendation**: Add composite index on (email, created_at)
because 80% of queries filter by email and sort by date.

**Approve, modify, or reject?**
```

### Explore First

Use when you need more context:

```text
DECISION POINT: Caching strategy unclear

**Context**: Multiple caching approaches could work here.

**Proposal**: Should I investigate Redis vs Memcached vs in-memory
options before recommending?
```

### Confidence Check

Use when uncertain:

```text
DECISION POINT: Migration approach

**Context**: Database migration could use blue-green or rolling strategy.

**My Confidence**: 60% on blue-green approach

**Would you like**:
1. My reasoning for blue-green
2. Exploration of alternatives
3. Expert consultation recommendation
```

### Batch Decisions

Use for related choices that share context:

```text
BATCH DECISIONS: Docker configuration (5 items)

| # | Decision        | My Recommendation |
|---|-----------------|-------------------|
| 1 | Base image      | node:20-alpine    |
| 2 | Build stage     | Multi-stage       |
| 3 | User            | Non-root          |
| 4 | Health check    | /health endpoint  |
| 5 | Resource limits | 512MB / 0.5 CPU   |

**Options**:
- Approve all
- Review each individually
- Modify specific items (list numbers)
```

### Escalation

Use when the decision is beyond the scope of an autonomous call:

```text
ESCALATION NEEDED: Security architecture

**Context**: This authentication flow has PCI compliance implications.

**My Assessment**: This requires security team review before proceeding.

**Options**:
1. Proceed with my best judgment (risky)
2. Wait for security review (recommended)
3. Document concerns and continue
```

## Response Handling

After receiving a response:

- **On "Approve"**: Proceed with recommended action, document the decision.
- **On "Modify"**: Clarify the modification, update the approach, confirm
  understanding before acting.
- **On "Explore"**: Investigate alternatives, return with a comparison
  matrix and an updated recommendation.
- **On "Review Details"**: Provide deeper analysis — pros/cons, risk
  assessment, second-order effects — then re-present the decision.
- **On "Defer"**: Add to the decision log, continue with non-blocked work,
  flag the deferred item for the next checkpoint.
- **On "Reject"**: Acknowledge, request alternative direction, adjust the
  approach. Do not retry the same option in a new wrapper.

## Decision Documentation

Logging decisions creates an audit trail for future reference. Significant
decisions — especially architectural, security-impacting, or trade-off
calls — should be recorded.

```markdown
### Decision: [Title]
- **Date**: [When decided]
- **Context**: [Why this decision was needed]
- **Options Considered**: [What was evaluated]
- **Decision**: [What was chosen]
- **Rationale**: [Why this choice]
- **Implications**: [What this means going forward]
```

Store these records in the location your project uses for decision logs
(e.g. `docs/decisions/`, an ADR directory, or a knowledge graph node).
The goal is recoverability: another agent or human should be able to
reconstruct why a choice was made months later.

## Quick Reference

| Situation                           | Pause? | Pattern             |
|-------------------------------------|--------|---------------------|
| Reversible, single valid approach   | No     | Just do it          |
| Multiple valid approaches           | Yes    | Options Selection   |
| Clear recommendation, high stakes   | Yes    | Review & Approve    |
| Insufficient information            | Yes    | Explore First       |
| Confidence below ~80%               | Yes    | Confidence Check    |
| Several related choices             | Yes    | Batch Decisions     |
| Beyond autonomous scope             | Yes    | Escalation          |
| Irreversible action                 | Always | Any of the above    |
