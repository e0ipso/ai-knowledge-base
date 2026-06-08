---
id: 7
group: "integration"
dependencies: [2, 4]
status: "completed"
created: 2026-06-08
skills:
  - kenkeep-operations
---
# Backfill this repo's tree: revert `.ai/kenkeep` to flat v1 and re-run the extended migrate

## Objective
Seed the single in-flight dogfood tree with authored folder summaries through the
real path. This repo's `.ai/kenkeep` tree is already v2 with no summaries, and
`migrate` will not re-fire on a v2 tree, so revert it to the flat v1 layout and
re-run the extended v1→v2 migrate (Task 4), which authors a summary per created
folder. This also exercises the extended migrate path end-to-end as a live
integration check.

## Skills Required
- `kenkeep-operations`: drive the kenkeep CLI (`migrate`, `index rebuild`) and reshape the on-disk tree on the feature branch, reviewing the result via `git diff`.

## Acceptance Criteria
- [ ] This repo's `.ai/kenkeep/nodes/` tree is reverted to the flat v1 layout (leaves under the legacy two-bucket `nodes/practice/`, `nodes/map/` arrangement that `detectSchemaVersion` reads as version 1), or an equivalent reproducible revert is performed on the feature branch.
- [ ] The extended v1→v2 migrate is run (with a real harness, since this is the live authoring path) so each created folder receives an authored `summary`.
- [ ] After migrate + `npx kenkeep index rebuild`, every created folder's `index.md` frontmatter carries a non-empty `summary`, and `ENTRY.md` plus the per-folder `index.md` files render the new actionable format (imperative pointers, embedded directive, breadcrumb, no statistics, reworked `## By topic`).
- [ ] The reshaping is reviewed via `git diff` and is acceptable (v2 is unreleased and the tree is a dogfood artifact, so re-clustering is permitted).
- [ ] The build is green and the full `vitest` suite passes against the post-backfill tree.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Depends on the extended migrate authoring path (Task 4) being built (`npm run build`) and on the rendering redesign (Task 2) so the regenerated files take the new format.
- `detectSchemaVersion` (`src/lib/migrate.ts`) reads the legacy `nodes/practice|map/` (leaf docs with no `index.md`) as version 1; the revert must reach a state it classifies as 1 so the v1→v2 step fires.
- The migrate clustering here runs against a real harness (`--harnesses`/`--harness`), unlike the test path; this is the sanctioned live authoring moment.

## Input Dependencies
- Task 2: the rendering redesign, so regenerated files take the actionable format.
- Task 4: the extended migrate that authors folder summaries (the mechanism this backfill uses).
- (Task 5 is not required for the migrate-based backfill; rebalance authoring is a separate path and is not exercised by this revert.)

## Output Artifacts
- This repo's `.ai/kenkeep` tree carrying authored folder summaries and the new index/ENTRY format — the live dogfood proof and the final integration step of the plan.

## Implementation Notes
This is destructive to the current tree by design; perform it on the feature
branch and review the diff. This task is operational, not a code change.

<details>
<summary>Detailed implementation guidance</summary>

1. **Build first.** Ensure Tasks 2 and 4 are merged and `npm run build` is green
   so the CLI carries the extended migrate and the new renderer.

2. **Revert to flat v1.** Reshape `.ai/kenkeep/nodes/` back to the flat v1 layout
   that `detectSchemaVersion` reads as 1 (legacy `nodes/practice/` and
   `nodes/map/` holding leaf `.md` files with NO generated `index.md`). The
   cleanest reproducible route is to check out the pre-tree (flat v1) state of the
   tree from git history if it exists, or mechanically move every leaf back into
   its kind bucket and delete the generated `index.md`/`ENTRY.md`/`GRAPH.md`.
   Confirm with `npx kenkeep migrate --dry-run` (or by reading `detectSchemaVersion`)
   that the tree now classifies as v1.

3. **Re-migrate with a real harness.** Run the v1→v2 migrate via the live path
   (e.g. `npx kenkeep migrate --harness <claude|codex|...>`). The clustering step
   authors a `summary` per created folder (Task 4). This requires a real harness
   adapter; it is the sanctioned authoring moment, so do not stub it here.

4. **Rebuild and verify.** Run `npx kenkeep index rebuild`. Open
   `.ai/kenkeep/ENTRY.md` and `.ai/kenkeep/nodes/<branch>/index.md` and confirm by
   inspection: non-empty folder summaries spliced into `Load …` pointers, embedded
   directive present, breadcrumb on non-root, no statistic lines, and a `## By
   topic` block with ≤3 path+summary entries per tag.

5. **Review and validate.** `git diff` the reshaped tree; confirm it is acceptable.
   Run `npm run build` and the full `vitest` suite; both must be green.

This is the plan's "Self Validation" step 1 made concrete for the dogfood tree.
No automated test is added here; the verification is the inspection + the existing
suite passing.
</details>
