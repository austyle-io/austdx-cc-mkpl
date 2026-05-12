---
name: edf-authoring
description: >
  Use when authoring or refactoring EDF (Enhanced Document Format) documents
  — agents, skills, commands, runbooks, decision-trees, or any structured
  AI-orchestration artifact. Provides XML tag vocabulary, the 4-layer
  progressive disclosure pattern, frontmatter conventions, and embed
  patterns for decision-trees. For runbook-specific authoring, see
  `runbook-authoring` skill. For autonomous EDF document generation,
  delegate to the `edf-author` agent.
---

<!-- @layer:1 -->

# EDF Authoring

EDF (Enhanced Document Format) is a structured markdown dialect for
AI-orchestration artifacts. It layers YAML frontmatter, semantic XML
tags, and progressive disclosure so a Claude session can load only what
it needs, when it needs it.

This skill is the **authoring reference**. If you need a document
written end-to-end, dispatch the `edf-author` agent. If you are writing
a multi-phase runbook with cleanup/rollback semantics, use the
`runbook-authoring` skill instead.

## When to use this skill

- Creating new skills, agents, commands, or rules
- Writing structured documentation that must be navigable by Claude
- Defining decision trees, checklists, or constraint sets
- Refactoring legacy markdown into progressive-disclosure layers
- Setting up reference networks between EDF documents

## The 4-layer progressive disclosure model

EDF documents are organized into four layers, loaded on demand. Keep
the cheap layers small; push detail into the expensive ones.

| Layer | Name                                                          | When loaded                      | Token budget |
| ----- | ------------------------------------------------------------- | -------------------------------- | ------------ |
| 1     | Executive Briefing (identity, goal, summary)                  | Always (on document discovery)   | < 500        |
| 2     | Operational Context (triggers, constraints, workflow)         | On activation signal             | < 2000       |
| 3     | Implementation Detail (examples, patterns, decision-trees)    | On keyword/topic match           | < 4000       |
| 4     | Reference (troubleshooting, edge cases, citations)            | On error, failure, or escalation | unbounded    |

**Authoring order:** write Layer 1 first. Until the summary is tight,
no other layer is worth writing — the rest is a fan-out from the goal.

## XML tag vocabulary

EDF uses a small set of semantic XML tags inside markdown. Tags are
parseable but the document remains valid markdown. Use them
consistently — Claude pattern-matches against tag names to decide what
to load.

### `<summary>` — Layer 1 (Executive Briefing) anchor

```xml
<summary>
  <goal>One sentence: what this document is for.</goal>
  <trigger-signals>
    - Phrase or task that should activate this document
    - Keyword Claude should match against
  </trigger-signals>
</summary>
```

### `<constraints>` — non-negotiable rules

```xml
<constraints id="naming" priority="critical">
  - File names use kebab-case
  - Frontmatter `name` must equal the directory name
</constraints>
```

Priority values: `critical` (failure = abort), `required` (must comply
unless waiver documented), `recommended` (default behavior).

### `<validation-workflow>` and `<step>` — ordered procedures

```xml
<validation-workflow id="check-frontmatter" steps="ordered">
  <step order="1">Parse YAML frontmatter</step>
  <step order="2">Verify `name` and `description` fields present</step>
  <step order="3">Confirm description starts with "Use when"</step>
</validation-workflow>
```

Use `steps="ordered"` for strict sequences. Use `steps="parallel"`
when steps are independent and order doesn't matter.

### `<examples>` — Layer 3 (Implementation Detail) content

```xml
<examples>
  <good language="markdown">
    # Concise heading
    Body that earns its tokens.
  </good>
  <bad language="markdown">
    # This Heading Has Too Many Words And Says Nothing Useful
    Body that pads with filler like "as we mentioned above".
  </bad>
</examples>
```

### `<references>` — link, don't duplicate

```xml
<references>
  <ref type="skill" path="../runbook-authoring/SKILL.md">
    For multi-phase execution procedures
  </ref>
  <ref type="agent" path="../../agents/edf-author.md">
    Autonomous EDF document author
  </ref>
  <ref type="external" path="https://yaml.org/spec/1.2.2/">
    YAML 1.2 specification
  </ref>
</references>
```

Reference types: `skill`, `agent`, `command`, `rule`, `guide`,
`external`.

## Frontmatter conventions

Skills and agents have different frontmatter shapes. Both are YAML.

### Skill frontmatter (minimal)

```yaml
---
name: skill-name
description: >
  Use when <trigger phrase>. <One-sentence summary of what the skill
  provides>. <Optional cross-reference to sibling skills>.
---
```

Rules:

- `name` must match the containing directory exactly
- `description` should begin with "Use when" so Claude's trigger
  matcher picks it up reliably
- Skills inherit the session model — do **not** add a `model:` field
- Keep description under ~80 words; this is what Claude reads when
  deciding to load the skill

### Agent frontmatter (richer)

```yaml
---
name: agent-name
description: >
  Use when <trigger phrase>. Autonomous agent that <does X>.
model: opus
tools: [Read, Edit, Write, Bash]
---
```

Agents may pin a model and declare a tool allowlist. Skills cannot.

## Embedding decision trees

When a document includes branching logic, embed a decision tree as
either an ASCII diagram or a YAML block. Prefer ASCII for short trees
(< 6 nodes); reach for YAML when the tree has metadata per branch.

### ASCII form (short trees)

```text
Q1: Does the outcome depend on conditional branching?
├── YES → Author a decision tree
└── NO  → Q2

Q2: Multi-phase execution with cleanup needed?
├── YES → Author a runbook
└── NO  → Embed workflow inline
```

### YAML form (richer trees)

```yaml
tree:
  root:
    question: "Is this an existing skill?"
    branches:
      yes:
        question: "Does the frontmatter use legacy `edf:` block?"
        branches:
          yes: { action: "strip-legacy-frontmatter" }
          no:  { action: "modernize-description" }
      no:
        action: "scaffold-new-skill"
```

Place `.tree.yaml` files in `decision-trees/` adjacent to the skill,
and reference them via `<ref type="guide">`.

## Choosing the right artifact

Not everything is a skill. Pick the structure that matches the job.

| Artifact      | Purpose                | Location                      | Use when                                |
| ------------- | ---------------------- | ----------------------------- | --------------------------------------- |
| Decision tree | Routing                | `decision-trees/*.tree.yaml`  | Conditional branching drives the path   |
| Runbook       | Execution              | `runbooks/*.md`               | Multi-phase ops with cleanup/rollback   |
| Checklist     | Verification           | `checklists/*-checklist.md`   | Validating against known criteria       |
| Skill         | Knowledge / guidance   | `skills/<name>/SKILL.md`      | Reusable authoring or domain expertise  |
| Agent         | Autonomous action     | `agents/<name>.md`            | Delegating a task end-to-end            |

These compose: a runbook can delegate to an agent, an agent can load a
skill, a skill can reference a decision tree, a decision tree can
route to runbooks.

## Layer-by-layer authoring guide

**Layer 1 — Executive Briefing (identity, goal, summary).** Write the
frontmatter and a one-paragraph summary. Answer: what is this, when
does Claude load it, what is the single goal? Keep it under 500
tokens. If you can't compress to that, the scope is too wide — split
the document.

**Layer 2 — Operational Context (triggers, constraints, workflow).**
Add `<constraints>` blocks and the primary `<validation-workflow>` or
numbered procedure. This is the "how" of the document. State
priorities explicitly.

**Layer 3 — Implementation Detail (examples, patterns,
decision-trees).** Add `<examples>` blocks with `good` and `bad`
variants. Show realistic, runnable artifacts. Bad examples are as
valuable as good ones — they encode the failure modes you want Claude
to avoid.

**Layer 4 — Reference (troubleshooting, edge cases, citations).**
Document error paths, edge cases, and escalation routes. This layer
can be unbounded because it only loads on failure.

## Common patterns

- **Reference, don't repeat.** If two skills share content, factor it
  into a third and link with `<ref>`. Duplicated prose drifts.
- **Frontmatter `name` = directory name.** Always. The harness uses
  the directory; humans read the frontmatter. They must match.
- **"Use when" first, summary second.** Claude's trigger matcher
  weights the opening of the description heavily.
- **Avoid model pinning in skills.** Skills inherit the session model
  so they work across Opus/Sonnet/Haiku contexts.
- **No mission-accomplished prose.** Skills are operational; cut
  marketing language and version histories.

## References

- `../runbook-authoring/SKILL.md` — multi-phase execution authoring
- `../../agents/edf-author.md` — autonomous EDF document author
- `https://yaml.org/spec/1.2.2/` — YAML 1.2 specification
