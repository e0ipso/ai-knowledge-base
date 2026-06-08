---
id: 5
group: "authoring"
dependencies: [1]
status: "completed"
created: 2026-06-08
skills:
  - typescript
  - vitest
---
# Extend rebalance ops to author a `summary` per new folder and update the kk-curate clustering step

## Objective
At the second sanctioned authoring moment — the rebalance clustering step — carry
a per-new-folder `summary` on the `split-folder`, `create-branch`, and
`split-leaf` operations, have `applyRebalancePlan` write it into the new folder's
`index.md` frontmatter (self-preserved thereafter), and update the kk-curate
SKILL.md clustering instructions and op-plan examples accordingly. `merge`
authors no summary (it creates no folder).

## Skills Required
- `typescript`: extend `RebalanceOpSchema` and `applyRebalancePlan` in `src/lib/rebalance-move.ts`.
- `vitest`: extend `tests/lib/rebalance.test.ts` / `tests/commands/rebalance.test.ts` to assert authored summaries persist across a rebuild.

## Acceptance Criteria
- [ ] `RebalanceOpSchema` (`src/lib/rebalance-move.ts:51`) gains a `summary` field on the folder-creating operations: `split-folder` (a `summary` per group/subfolder), `create-branch` (one `summary`), and `split-leaf` (one `summary` for the new folder). `merge` is unchanged (no folder created).
- [ ] `applyRebalancePlan` writes each authored `summary` into the corresponding new folder's `index.md` frontmatter via `IndexFrontmatterSchema`; a subsequent `index rebuild` preserves it (Success Criterion 5).
- [ ] The kk-curate SKILL.md clustering step (`.claude/skills/kk-curate/SKILL.md` around §6b.2) and its source of truth (`src/templates-source/skills/kk-curate/SKILL.md`) are updated so the LLM authors a `summary` per new folder, with the phrasing contract (completes `for more information on …`), and the op-plan JSON examples show the new field.
- [ ] `merge` carries no new summary; the destination keeps its self-preserved summary (documented as accepted staleness).
- [ ] Tests: a `split-folder`/`create-branch`/`split-leaf` plan with per-folder summaries writes them into the new folders' `index.md`; a follow-up rebuild preserves them; existing move invariants (byte-stable renames, id stability, split-leaf redirect) still hold.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- `RebalanceOpSchema` is a `z.discriminatedUnion('operation', [...])` with `.strict()` members; adding a field requires updating the relevant member object(s). For `split-folder`, the group object `{ subfolder, ids }` is the natural place for `summary` (one per created subfolder). For `create-branch` and `split-leaf`, add a top-level `summary`.
- `applyRebalancePlan` (`:175`) relocates leaves (`relocateBytes`) and, for `split-leaf`, mints new docs. After the moves create a folder, write that folder's `index.md` summary into frontmatter. The command wrapper drives the deterministic rebuild afterward, which must self-preserve the just-written summary (Task 1).
- The SKILL.md changes are the AI-facing contract; both the installed copy (`.claude/skills/...`) and the template source (`src/templates-source/skills/...`) must match (the source generates the installed copy).

## Input Dependencies
- Task 1: `IndexFrontmatterSchema.summary` and the self-preserve carry.

## Output Artifacts
- An extended rebalance authoring path satisfying Success Criterion 5; the kk-curate skill contract documenting it (overlaps with, but is the authoritative op-plan example for, the Task 6 documentation pass).

## Implementation Notes
Second of the two sanctioned authoring moments. The clustering LLM invents the
summary; `applyRebalancePlan` only writes it; the next rebuild carries it.

<details>
<summary>Detailed implementation guidance</summary>

1. **Schema.** Extend the discriminated union members:
   - `split-folder`: change each group to
     `{ subfolder: z.string().min(1), summary: z.string(), ids: z.array(...).min(1) }.strict()`.
   - `create-branch`: add `summary: z.string()` to the member object.
   - `split-leaf`: add `summary: z.string()` (the new folder's summary; distinct
     from each child leaf's own `summary` already in `SplitLeafChildSchema`).
   - `merge`: unchanged.
   Keep `.strict()`; update `RebalancePlanSchema` consumers if the shape widening
   breaks any inference.

2. **Write on apply.** In `applyRebalancePlan` (`:175`):
   - `split-folder`: after relocating a group's leaves into `subRel`, write
     `nodes/<subRel>/index.md` frontmatter with `summary = group.summary`.
   - `create-branch`: after relocating into `op.folder`, write
     `nodes/<op.folder>/index.md` summary.
   - `split-leaf`: after minting children into `op.folder`, write
     `nodes/<op.folder>/index.md` summary.
   Use the same minimal-`index.md`-stamp or rebuild-threading approach chosen in
   Task 4 (keep the two authoring tasks consistent). The command wrapper's
   subsequent rebuild self-preserves the value.

3. **SKILL.md (both copies).** In `.claude/skills/kk-curate/SKILL.md` §6b.2
   (lines ~437–440) and the matching `src/templates-source/skills/kk-curate/SKILL.md`:
   - Add to the `split-folder` emit example a `summary` per subfolder:
     `{"operation":"split-folder","branch":"<folder>","groups":[{"subfolder":"<name>","summary":"<fragment>","ids":["<id>", ...]}, ...]}`.
   - Add `summary` to `create-branch` and `split-leaf` emit examples.
   - State the phrasing contract: the folder `summary` must complete
     `for more information on <summary>` (noun phrase / sentence fragment).
   - Note `merge` authors no summary.

4. **Tests** (`tests/lib/rebalance.test.ts` and/or `tests/commands/rebalance.test.ts`):
   - Build a tree, run `applyRebalancePlan` with a `split-folder` (and one of
     `create-branch`/`split-leaf`) carrying per-folder summaries.
   - Assert each new folder's `index.md` frontmatter has the authored `summary`.
   - Run `generateIndex`/`index rebuild` and assert the summary persists
     (Success Criterion 5).
   - Assert existing invariants: git-rename byte stability, id stability for
     split-folder/create-branch, split-leaf minted ids + redirect.

**Test philosophy — "write a few tests, mostly integration".** Meaningful tests
verify custom business logic, critical paths, and edge cases specific to this
application. Test *your* code, not the framework. WRITE tests for: custom
business logic and algorithms; critical workflows and data transformations; edge
cases and error conditions for core functionality; integration points; complex
validation. Do NOT write tests for: third-party library functionality; framework
features; simple CRUD without custom logic; trivial getters/setters or static
config; obvious functionality that would break immediately if incorrect. The
author-then-preserve round-trip across one rebuild is the integration point to
cover; do not write a separate test per operation variant when one split-folder
plus one create-branch/split-leaf case exercises the path.
</details>
