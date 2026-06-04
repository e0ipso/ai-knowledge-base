---
id: 4
group: "runtime-paths"
dependencies: []
status: "completed"
created: 2026-06-03
skills:
  - typescript
---
# Data directory & runtime path rename

## Objective
Move the artifact directory the tool reads/writes in consumer repos from
`.ai/knowledge-base/` to `.ai/analecta/` by changing the base segment in the
path resolver and updating any hard-coded path literals.

## Skills Required
- **typescript**: edit `src/lib/paths.ts` and any modules with hard-coded `.ai/knowledge-base` literals.

## Acceptance Criteria
- [ ] `src/lib/paths.ts` derives the base data segment as `analecta` (was `knowledge-base`); all derived paths follow automatically.
- [ ] The directory substructure is unchanged: `nodes/`, `_sessions/`, `_logs/`, `.state/`, `.config/`, `INDEX.md`, `GRAPH.md`, `config.yaml`.
- [ ] `init`, `doctor`, and every other source location with a hard-coded `.ai/knowledge-base` string literal now use `.ai/analecta`.
- [ ] No legacy-directory detection/fallback is added (clean break).
- [ ] `grep -rIn '\.ai/knowledge-base' src` returns no functional literals.
- [ ] `npm run typecheck` passes.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
The path resolver is `src/lib/paths.ts`. Changing the single base segment there
should cascade to all derived path getters. Then sweep `src/` for any string
that hard-codes the old directory rather than going through the resolver.

## Input Dependencies
None. Zero-dependency Phase 1 task.

## Output Artifacts
- `src/lib/paths.ts` resolving `.ai/analecta/`.
- Updated `init`/`doctor`/literal references.

The new base path is required by the dogfood KB migration task (its `git mv`
target must match this resolver).

## Implementation Notes
Only the *location* changes — no `schema_version` bump, no field renames, no
migrator. A consumer on the old version simply has an unrecognized
`.ai/knowledge-base/`; the documented upgrade is "move the dir and re-run
`init`" (handled in the docs task), not in code.

<details>
<summary>Step-by-step</summary>

1. Open `src/lib/paths.ts`. Find the constant/segment that produces
   `knowledge-base` under `.ai/` (e.g. a `KB_DIR`/`baseSegment` value or a
   literal in the root-path getter). Change it to `analecta`.
2. Confirm derived getters (nodes dir, sessions dir, logs dir, state dir,
   config dir, INDEX.md, GRAPH.md, config.yaml) all build off that segment so
   they now resolve under `.ai/analecta/`. Do not change the sub-names.
3. Sweep for hard-coded literals: `grep -rIn '\.ai/knowledge-base' src`. For
   each functional hit (notably in `init` and `doctor` flows), replace with the
   resolver or `.ai/analecta`.
4. Confirm no legacy-dir detection exists or is added.
5. Run `npm run typecheck`.
</details>
