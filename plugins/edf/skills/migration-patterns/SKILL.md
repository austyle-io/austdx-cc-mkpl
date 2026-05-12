---
name: migration-patterns
description: >
  Use when planning or executing a migration — moving code, docs, schemas, or
  data between locations, formats, or systems. Triggers include "move this
  directory", "rename across the repo", "convert from X to Y", "before I run
  this migration script", "is this migration safe". Covers the dry-run-first
  principle, rollback-ready execution, idempotency rules for safe replay,
  per-phase verification gates, and link-rewrite hygiene for cross-references.
---

<!-- @layer:1 -->

# Migration Patterns

Migrations fail in the same ways: someone runs the real thing before a dry
run, there's no way back when step 7 of 12 breaks, re-running the script
double-creates everything, nobody checks the result until the next morning,
and half the links still point at the old location. This skill is the
checklist that prevents those.

## Core principles

1. **Dry-run first, always.** No migration runs against real targets until
   a dry-run on the same inputs has been reviewed.
2. **Rollback before forward.** Know how to undo each phase before you
   start it. If you can't undo it, you can't ship it.
3. **Idempotent by construction.** Running the migration twice must yield
   the same end state as running it once. No duplicates, no double-writes.
4. **Verify per phase.** Each phase has a gate: a check that must pass
   before the next phase starts.
5. **Rewrite links in lockstep.** When something moves, every reference to
   it moves in the same commit. Stale links are the #1 post-migration bug.

## The phases

```text
Plan ──▶ Dry-run ──▶ Stage ──▶ Execute ──▶ Verify ──▶ Cleanup
  │         │          │          │           │          │
  └─ rollback plan exists at every transition ──────────┘
```

- **Plan.** Inventory what moves, map dependencies, choose an order.
- **Dry-run.** Same code path as execute, but writes nowhere. Diff the
  intended state against current state and show it for review.
- **Stage.** Apply to a non-production target (preview branch, staging DB,
  scratch directory). Verify there.
- **Execute.** Apply to the real target. Log every action with enough
  detail to reverse it.
- **Verify.** Run the post-conditions. Sample-check by hand.
- **Cleanup.** Remove the old artifacts only after verification passes
  and the rollback window has elapsed.

## Dry-run pattern

A dry run is not "I'll comment out the writes." It's a first-class mode
of the same script. Patterns that work:

```ts
// flag-based: same code, no writes
async function migrate(opts: { dryRun: boolean }) {
  for (const item of items) {
    const plan = computeChange(item);
    if (opts.dryRun) {
      log.info("would change", { id: item.id, plan });
    } else {
      await applyChange(item, plan);
      log.info("changed", { id: item.id, plan });
    }
  }
}
```

```bash
# diff-based: emit intended state, compare to actual
./migrate.ts --emit-plan > plan.json
./diff-plan plan.json   # human review
./migrate.ts --apply plan.json  # apply the exact plan that was reviewed
```

The second form is stronger: the artifact reviewed is the artifact
applied. No drift between "what I saw" and "what ran."

## Rollback patterns

Pick one before you start. Don't decide mid-incident.

| Pattern | When to use | Cost |
|---|---|---|
| **Reverse script** | Schema/data with known forward delta | Need to write & test it |
| **Backup + restore** | Data, files, anything snapshot-able | Storage + downtime |
| **Dual-write window** | Cutover between two live systems | Code complexity, must reconcile |
| **Git revert** | Code, docs, anything in version control | Free if no out-of-band writes happened |
| **Feature flag off** | Behavioral migrations gated on a flag | Must build the flag |

For multi-phase migrations, each phase needs its own rollback. Phase 3
shouldn't depend on rolling back phases 1 and 2 — those may already be
shipped and consumed by other systems.

## Idempotency rules

A migration is **idempotent** if running it N times produces the same
end state as running it once. This matters because:

- Retries on partial failure are safe.
- Re-running to "catch up" after a pause is safe.
- Two operators triggering it concurrently is safe (well — with locking).

How to get it:

1. **Check before write.** Read the current state, only write the
   delta. `MERGE` over `CREATE`, `upsert` over `insert`.
2. **Use stable IDs.** Derive target IDs from source state, not from
   counters or timestamps. Same input → same output ID.
3. **Mark completed work.** Write a `migrated_at` field, or maintain a
   ledger of (source_id → target_id). Skip what's already done.
4. **Avoid side-effects on read paths.** Don't fire emails, webhooks, or
   audit events from inside the migration unless those are also
   idempotent.

Counter-examples that bite:
- Appending to a list without checking membership → duplicates on retry.
- `INSERT` without `ON CONFLICT` → primary-key errors halt the run.
- Renaming a file without checking if the target exists → silent
  overwrite of work from a previous run.

## Verification gates

Each phase needs a checkable post-condition. Examples:

- **After plan:** Inventory count matches expectations; no orphan refs.
- **After dry-run:** Plan reviewed and approved; diff is non-empty and
  scoped to expected entities.
- **After stage:** All staging tests green; sample records match
  expected shape.
- **After execute:** Row counts within tolerance; checksums match;
  no error log lines.
- **After verify:** External callers still work (smoke test); search
  indices rebuilt; permissions intact.

A failed gate halts the migration. Don't paper over it — diagnose, fix,
and re-run from the last good gate.

## Link-rewrite hygiene

When a file/route/record moves, every reference to it must move too.
Otherwise the migration "succeeded" but the system is broken.

The discipline:

1. **Find before move.** Before relocating `X`, search for every
   reference to `X`. This is the rewrite worklist.
2. **Rewrite in the same commit.** Don't ship the move and the rewrites
   as separate steps — that creates a window where references are stale.
3. **Add a redirect when possible.** For URLs, file paths reachable via
   loader, or DB foreign keys, a redirect/alias buys you grace if a
   reference was missed.
4. **Hunt for stragglers.** After the rewrite, search again. Anything
   matching the old name is either a bug, a comment that should be
   updated, or an intentional historical reference (mark it).

Tools:
- Code references: `rg "old-name" --type-not lock`
- Markdown links: `rg '\]\([^)]*old-path' -g '*.md'`
- DB references: query foreign-key tables for old IDs
- Config files: re-read every YAML/JSON that loads paths

## Order of operations

When migrating things with dependencies, leaf-first. A consumer breaks if
its dependency moves out from under it, but a dependency is safe to move
before its consumers know.

```text
1. Identify dependency graph
2. Topologically sort: leaves (no dependencies) first
3. Migrate each node, then update its consumers to point to the new location
4. Repeat until no nodes remain
```

If the graph has cycles, break the cycle with a dual-write window or a
shim that translates between old and new during cutover.

## Common gotchas

- **"It worked in staging."** Staging data is smaller, cleaner, and
  doesn't have that one weird row from 2019. Always run the dry-run
  against production-shaped data.
- **Silent skips.** A loop that catches exceptions and `continue`s will
  cheerfully skip every failing record. Count skips. Alert on non-zero.
- **Implicit ordering.** "First migrate users, then orders" is true
  until someone runs them in parallel. Make the ordering explicit
  (locks, sequencing, gates).
- **The clock.** Migrations that filter by `updated_at` miss records
  modified during the run. Bracket the run with a freeze, or do a
  catch-up pass.
- **Permissions and ownership.** Moved files inherit the mover's
  permissions, not the original's. Set permissions explicitly.
- **Caches and indices.** Search indices, CDN caches, materialized
  views — none of these update automatically. Schedule the rebuild.
- **Forgotten cleanup.** Old artifacts left lying around get edited by
  someone who didn't get the migration memo. Delete them, or make them
  unmistakably read-only and labeled as deprecated.

## Migration checklist

Before starting:
- [ ] Inventory complete; dependency order chosen
- [ ] Dry-run mode implemented and tested
- [ ] Rollback path chosen and tested
- [ ] Verification gates defined per phase
- [ ] Reference rewrite plan drafted

During execution:
- [ ] Dry-run reviewed and approved
- [ ] Each phase gated by its post-condition check
- [ ] Every action logged with enough detail to reverse
- [ ] Skips and warnings counted, not ignored

After execution:
- [ ] All verification gates green
- [ ] Reference rewrite complete (re-grep for old names)
- [ ] Caches/indices rebuilt
- [ ] Rollback window observed before cleanup
- [ ] Old artifacts removed or clearly marked deprecated
