---
id: 5
group: "self-description"
dependencies: [2, 3]
status: "pending"
created: 2026-06-09
skills:
  - typescript-node-cli
  - technical-writing
---
# Scope every remaining migration self-description to the generic dispatch

## Objective
Make every surface that names the migration flow describe the generic design: the `place` command-group help presents `place` as the v1→v2 step's primitives under `migrate status` dispatch, the `MIGRATE_COMMAND_HINT` doc comment narrates dispatch-then-procedure instead of the v1→v2 flow, and the doc comments that call themselves "the" migration primitives are scoped to the step they implement.

## Skills Required
- `typescript-node-cli` — editing commander descriptions and TypeScript doc comments without behavioral change.
- `technical-writing` — accurate, non-drifting self-description prose.

## Acceptance Criteria
- [ ] The `place` group description in `src/cli.ts` (currently "Deterministic, LLM-free v1->v2 migration placement primitives…") presents `place` as the primitives of the `flat-to-tree` (v1→v2) step, driven by the kk-migrate skill under `migrate status` dispatch; the `place inventory` subcommand description ("Deterministic, LLM-free migration check…") is likewise scoped to its step rather than reading as the global migration check, and mentions the version-1 gate.
- [ ] The doc comment above `MIGRATE_COMMAND_HINT` in `src/lib/migrate-guidance.ts` narrates the generic flow (skill queries `migrate status`, then runs each pending step's documented procedure via that step's primitives) instead of narrating the v1→v2 clustering specifically. The exported string itself is verified against the new wiring: it already reads generically and is expected to survive byte-identical; if it turns out to name v1→v2 anywhere, correcting it is in scope.
- [ ] The module doc comments in `src/commands/place.ts` (both `runPlaceInventory` and `runPlaceApply` headers, "…primitive for the v1->v2 migration") and `src/lib/migrate-read.ts` (`FlatLeaf` header) are scoped to the flat-to-tree step they implement, including the version-1 gate task 3 added, and no longer read as "the" migration machinery.
- [ ] A grep over the repo's human docs (README, AGENTS.md, docs/) for `kk-migrate` and `place inventory` confirms no further doc changes are needed; any hit that contradicts the new design is reported, not silently left.
- [ ] No behavioral change: build, lint, and the full test suite pass. Any test that asserts help text or the guidance wording is updated to the new prose without weakening what it proves.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Files: `src/cli.ts` (place group wiring around lines 170–191), `src/lib/migrate-guidance.ts`, `src/commands/place.ts`, `src/lib/migrate-read.ts`. Doc comments in `src/lib/migrate.ts` are already handled by task 1 — do not re-edit them here.
- Kenkeep knowledge-base nodes describing the old wiring are snapshots: if one is found directly contradicting the new design, flag it to the user; do not edit the KB.

## Input Dependencies
- Task 2: the `migrate` group exists in `src/cli.ts` (same file edited here) and the dispatch wording must reference the real command.
- Task 3: the gated `place` behavior these comments and descriptions now describe (and `src/commands/place.ts` is the same file task 3 edits).

## Output Artifacts
- Self-consistent CLI help and doc comments across the four files — the plan's Self-Description Cleanup deliverable, closing out the Documentation section.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

Surfaces and their target framing:

1. `src/cli.ts` place group (`.command('place').description(...)`): something like "Deterministic, LLM-free primitives for the flat-to-tree (v1->v2) migration step; driven by the kk-migrate skill after `migrate status` reports the step pending. Refuse unless the on-disk knowledge base is at schema_version 1." Keep commander description conventions (single string, present tense) used by neighboring groups.
2. `src/cli.ts` `place inventory` description: keep the JSON-shape documentation, drop the implication that it is the migration check — `migrate status` is the dispatch entrypoint; inventory emits the flat leaves for clustering once the flat-to-tree step is confirmed pending.
3. `src/lib/migrate-guidance.ts`: the doc comment currently narrates "the v1->v2 clustering runs in the host agent's current session… drives the deterministic `place` primitive". Rewrite to: the skill first runs the deterministic `migrate status` dispatch, then executes each pending step's documented procedure via that step's primitives; still interactive-session-only; the constant remains the single place naming the skill. Then confirm `MIGRATE_COMMAND_HINT`'s exported string needs no change (it says "the `/kk-migrate` skill in your agent session (migration now requires an interactive session)" — already generic).
4. `src/commands/place.ts` headers: change "Deterministic, LLM-free inventory/apply primitive for the v1->v2 migration" framing to "…for the flat-to-tree (v1->v2) migration step", and mention the exactly-version-1 gate in both. Keep the abort-before-write and machine-readable-contract prose intact.
5. `src/lib/migrate-read.ts` `FlatLeaf` doc: scope "the leaves a v1->v2 step is about to place" wording to the flat-to-tree step explicitly (light touch — it is nearly correct already).

Verification sweep (plan's Documentation section): `grep -rn "kk-migrate\|place inventory" README.md AGENTS.md docs/ 2>/dev/null` — the plan expects no hits requiring changes; report anything that contradicts the new design. Also grep `tests/` for asserted description or guidance strings (plan 47 added tests around the repointed guidance) and update expectations to the new prose where they assert the old wording.

This task is prose-only by design: if any edit would change runtime behavior, stop — that work belongs to tasks 2 or 3.

</details>
