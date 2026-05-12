---
name: scaffold-edf-component
description: >
  Use when creating a new EDF component (agent, skill, command, hook, rule,
  guard, grit-pattern, checklist, or decision-tree) from a template.
  Selects the right template, gathers required variables, and produces a
  properly-structured EDF document at the target path. Companion to the
  `edf-authoring` skill (the format reference) and `edf-author` agent (for
  autonomous authoring of complex docs). For runbooks specifically, use
  `runbook-scaffold`. For system-architecture doc sets, use
  `arch-doc-scaffold`.
---

# Scaffold EDF Component

This skill guides Claude through scaffolding a new EDF component from the
templates engine at `@austyle-io/edf` (`src/templates/`). It maps the
requested component type to a template, collects required variables,
applies sensible defaults, and writes the rendered output to the
correct location.

For the EDF format itself (XML tags, layer model, frontmatter rules), use
the `edf-authoring` skill. For full end-to-end authoring of a complex
document where you want a draft from intent, dispatch the `edf-author`
agent. Use this skill for the narrower job of stamping out a new
structurally-correct file.

## When to use this skill

- "Create a new agent / skill / command / hook / rule / guard..."
- "Scaffold a checklist / decision tree / grit-pattern..."
- "Bootstrap an EDF document from the standard template"
- User invokes a legacy `/bootstrap-component` style request

If the task is "write me a runbook with phases and rollback", route to
`runbook-authoring`. If the task is "convert this markdown to EDF", route
to `edf-author`. This skill is for fresh files from templates.

## Component-type catalog

The templates engine ships these templates under
`@austyle-io/edf/src/templates/templates/`. Each has a frontmatter block
declaring required and optional variables plus a default output path.

| Type           | Template file                       | Default output                                        |
| -------------- | ----------------------------------- | ----------------------------------------------------- |
| agent          | `agent.template.md`                 | `agents/${AGENT_ID}.md`                               |
| skill          | `skill.template.md`                 | `skills/${SKILL_ID}/SKILL.md`                         |
| command        | `command.template.md`               | `commands/${COMMAND_ID}.md`                           |
| hook           | `hook.template.md`                  | `.claude/hooks/${HOOK_TYPE}-${AGGREGATOR_NAME}-...ts` |
| rule           | `rule.template.md`                  | `.agents/rules/${CATEGORY}/${RULE_NAME}.md`           |
| guard          | `guard.template.md`                 | `.claude/hooks/lib/guards/${GUARD_NAME}.ts`           |
| grit-pattern   | `grit-pattern.template.md`          | `.grit/patterns/${PATTERN_NAME}.md`                   |
| checklist      | `checklist.template.md`             | `.agents/rules/${CATEGORY}/${CHECKLIST_NAME}.md`      |
| decision-tree  | `decision-tree.template.md`         | `.agents/decision-trees/${TREE_NAME}.md`              |
| subagent-chk   | `subagent-checklist.template.md`    | `examples/checklists/checklist-subagent-...md`        |
| tool-chk       | `tool-checklist.template.md`        | `examples/checklists/checklist-...md`                 |

When scaffolding inside a plugin (`plugins/<name>/...`), override the
engine defaults to the plugin layout: agents at `<plugin>/agents/<id>.md`,
skills at `<plugin>/skills/<id>/SKILL.md`, commands at
`<plugin>/commands/<id>.md`. Confirm target plugin or repo before writing.

## Required variables by type

These are the variables Claude must collect before rendering. Optional
variables can be omitted; the template applies its defaults.

### Agent

| Variable           | Notes                                              |
| ------------------ | -------------------------------------------------- |
| `AGENT_ID`         | kebab-case, matches filename                       |
| `AGENT_NAME`       | Title-case display name                            |
| `AGENT_DESCRIPTION`| Multi-line "Use when..." description               |
| `AGENT_GOAL`       | One-sentence goal                                  |
| `TRIGGER_SIGNALS`  | List of activation phrases                         |
| `TOOLS`            | YAML list: `[Read, Edit, Write, Bash]`             |

Optional: `MODEL` (default `sonnet`), `COLOR`, `LEAGUE`, `DOMAIN`,
`PERSPECTIVE`, `EXPERTISE`, `AUTHORITY`, `CONSTRAINTS`, `WORKFLOWS`,
`CORE_CAPABILITIES`, `OUTPUT_FORMATS`, `BEHAVIORAL_DIRECTIVES`,
`COLLABORATION`, `EXAMPLE_*`.

### Skill

| Variable             | Notes                                            |
| -------------------- | ------------------------------------------------ |
| `SKILL_ID`           | kebab-case, matches directory name               |
| `SKILL_NAME`         | Title-case display name                          |
| `SKILL_DESCRIPTION`  | "Use when..." description                        |
| `SKILL_GOAL`         | One-sentence goal                                |
| `TRIGGER_SIGNALS`    | List of activation phrases                       |

Optional: `CATEGORY` (default `quality`), `ALIASES`, `RELATED_*`,
`ALLOWED_TOOLS`, `CONSTRAINTS`, `CRITICAL_RULES`, `VALIDATION_WORKFLOW`,
`EXAMPLE_PATTERNS`, `RULE_FILES`, `ENFORCEMENT_PRIORITY`.

Note: modern skills no longer use `model:` — leave it out so the skill
inherits the session model.

### Command

| Variable               | Notes                                          |
| ---------------------- | ---------------------------------------------- |
| `COMMAND_ID`           | kebab-case slug                                |
| `COMMAND_NAME`         | Title-case display name                        |
| `COMMAND_DESCRIPTION`  | "Use when..." description                      |
| `COMMAND_GOAL`         | One-sentence goal                              |
| `TRIGGER_SIGNALS`      | Activation phrases                             |

Optional: `CATEGORY` (default `orchestration`), `ALIASES`, `EXAMPLES`,
`HERO`, `ARGUMENT_HINT`, `ALLOWED_TOOLS`, `INSTRUCTIONS`,
`ARGUMENTS_TABLE`, `OUTPUT_FORMAT`, `RELATED_*`.

### Hook / Guard / Rule / Pattern / Checklist / Decision-tree

For these, open the template and read its frontmatter
`variables.required` list directly — each is small. Collect required,
accept defaults for the rest.

## Variable conventions

- **Identifiers** (`*_ID`, slug-shaped `*_NAME`): kebab-case only. The
  engine has a `kebab-case` filter on some paths, but clean input
  prevents surprises.
- **Display names** for headings: Title Case is fine.
- **Lists** (`TRIGGER_SIGNALS`, `TOOLS`, `EXAMPLES`): YAML arrays —
  templates iterate with `{{#each}}`.
- **Multi-line descriptions**: pass as a single field; the template
  emits it under `description:` with a `|` block.
- **Frontmatter `name`** must equal the filename or directory slug.

## Scaffolding workflow

When invoked, follow this procedure.

### 1. Identify the component type

Ask the user, or infer from context:

```text
Q: What kind of EDF component are you creating?
- agent / skill / command / hook / rule / guard
- grit-pattern / checklist / decision-tree
- subagent-checklist / tool-checklist
```

If the request is vague ("create a new EDF doc"), default to asking. If
the user says "scaffold a skill called X", proceed directly.

### 2. Resolve the template path

Look up the template file at
`@austyle-io/edf/src/templates/templates/<type>.template.md`. If the
file is not present in the current repo, fall back to:

- `/Users/tyleraustin/Github/edf/src/templates/templates/`
- Or whatever path the `@austyle-io/edf` library is installed to.

Read the frontmatter to confirm the variable list — do not rely on this
skill's catalog if there is drift.

### 3. Resolve the output path

Start with the template's `output.path`. Then check:

- Is the user scaffolding inside a plugin (`plugins/<name>/...`)?
  Override the output path to the plugin-local convention.
- Is the user scaffolding inside `.agents/` for a consumer repo? Keep
  the template default.
- Does the target file already exist? Abort and ask before overwriting.

### 4. Gather required variables

For each variable in the template's `variables.required` list, prompt
the user once. Batch prompts where possible. Apply the conventions
above. Validate:

- IDs are kebab-case
- Lists are non-empty when required
- Tool allowlists reference real tool names (`Read`, `Edit`, `Bash`,
  `Grep`, `Glob`, `Write`)

### 5. Render and write

The templates engine uses Handlebars-style syntax (`{{#if}}`,
`{{#each}}`, `${VAR}`). You can either:

- Run the engine: `pnpm dlx tsx /Users/tyleraustin/Github/edf/src/templates/cli.ts process <template> <vars>`
- Or render inline by substituting `${VAR}` references and resolving
  `{{#if}}` / `{{#each}}` blocks against the collected variables.

For one-off scaffolds inline rendering is fine. For batch operations or
when the user wants a reproducible build, use the CLI.

Create any missing parent directories. Write the file. Do **not**
overwrite an existing file silently — abort and surface the conflict.

### 6. Validate and report

After writing:

1. Confirm the file exists at the expected path.
2. Read it back and verify the YAML frontmatter parses (no stray `${}`
   placeholders, no orphan `{{#if}}` blocks).
3. Report:
   - Component type and ID
   - Output path (absolute)
   - Any defaults that were applied
   - Suggested next steps (review, add examples, run validation)

If the plugin has a validator available (e.g., via the `edf-validate`
skill), recommend running it but do not invoke without user consent.

## Modernization pass

The engine templates still emit legacy fields (`edf:` wrapper, `version:`,
`model:` on skills, `<example>` blocks inside YAML descriptions, league
metadata). The current conventions in `edf-authoring` are slimmer:
top-level `name` / `description` / (agents) `model` / `tools` only, no
`edf:` block, no `version:`, no skill model pin. When the target follows
the modern convention, strip those fields after rendering. When emitting
for the existing engine consumers, leave them. Ask if unclear.

## Constraints

- Never overwrite an existing file without explicit confirmation.
- Never invent variable values to bypass prompts — ask the user.
- Always match `name:` to the filename / directory.
- Always use kebab-case for IDs.
- Always re-validate frontmatter after rendering (no stray `${}` or
  unresolved `{{#if}}`).
- Prefer the templates CLI over inline rendering for batches.

## References

- `../edf-authoring/SKILL.md` — EDF format reference (XML tags, layers,
  frontmatter conventions)
- `../runbook-authoring/SKILL.md` — for multi-phase runbook authoring
- `../../agents/edf-author.md` — autonomous EDF document author for
  end-to-end drafts
- `@austyle-io/edf` `src/templates/` — the templates engine, CLI,
  registry, and template files
- `@austyle-io/edf` `src/templates/templates/*.template.md` — the
  canonical templates with variable manifests
