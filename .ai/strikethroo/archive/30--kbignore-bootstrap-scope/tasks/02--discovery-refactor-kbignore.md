---
id: 2
group: "discovery"
dependencies: []
status: "completed"
created: "2026-05-22"
skills:
  - typescript
  - unit-testing
---
# Refactor discovery: replace include/exclude/sourceDir with `.kbignore`, push gitignore + kbignore into walk descent, delete `harnessInstructionSkipPatterns`

## Objective

Reduce `discoverMarkdownFiles` to a single composed filter (`STATIC_SKIPS ∪ .gitignore ∪ .kbignore`), walk from repo root unconditionally, and integrate `.kbignore` symmetrically with `.gitignore` in `runBootstrapIncremental`. Delete `harnessInstructionSkipPatterns` (its responsibility moves to the Task 1 stub). Extend the `no-docs` result with the pre-filter scanned count so the command layer (Task 3) can format the new diagnostic.

## Skills Required

- typescript
- unit-testing

## Acceptance Criteria

- [ ] `DiscoverOptions` drops `sourceDir`, `include`, `exclude`, `extraStaticSkips`. Adds `kbignore?: Ignore`. Keeps `repoRoot`, `gitignore?`.
- [ ] `discoverMarkdownFiles` walks `repoRoot` instead of `sourceDir`. The filter chain becomes: posix-relativize → `STATIC_SKIPS` (no `--include` opt-back-in inversion; that branch is removed) → `.gitignore` → `.kbignore` → sort → return.
- [ ] `walk` short-circuits directory descent using both `.gitignore` and `.kbignore` (`ig.ignores(relDir + '/')`) in addition to the existing `.git`/`node_modules` short-circuits.
- [ ] `BootstrapContext` drops `sourceDir`, `include`, `exclude`. `runBootstrapIncremental` loads `.kbignore` from repo root symmetrically with `.gitignore` (parallel `loadIgnoreFile`-style helper if useful; otherwise inline).
- [ ] `BootstrapResult` (on the `no-docs` branch only) gains `scannedBeforeFilter: number` reporting the count of `.md` files the walk visited prior to `.gitignore` / `.kbignore` filtering.
- [ ] `src/harnesses/registry.ts`: `harnessInstructionSkipPatterns` symbol and all its imports/call-sites removed. `grep -R 'harnessInstructionSkipPatterns' src/` returns no matches.
- [ ] `tests/lib/bootstrap.test.ts` rewritten: covers `.kbignore` directory exclude; `.kbignore` un-ignoring a file under a non-excluded parent (`*` then `!docs/` then `!docs/AGENTS.md`); `.gitignore` ∪ `.kbignore` composition; `STATIC_SKIPS` still applied; harness instruction dirs no longer auto-skipped (now skipped only because the default stub denies them — assert the lib without a stub does NOT auto-skip). Old `extraStaticSkips`/`include`/`exclude`/`harnessInstructionSkipPatterns` tests are deleted (no orphan imports).
- [ ] `npm run build` and `npm test` pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `src/lib/bootstrap.ts` (primary surface; lines 5, 179, 196, 202, 212, 271–274, 279 are the anchors called out in the plan).
- `src/harnesses/registry.ts` (delete `harnessInstructionSkipPatterns`).
- `tests/lib/bootstrap.test.ts` (rewrite discovery cases).
- The `ignore` package's `Ignore.ignores(path)` API (already a dependency).

## Input Dependencies

None — this task can proceed in parallel with Task 1.

## Output Artifacts

- A discovery API that Task 3 (CLI/command) consumes: `discoverMarkdownFiles({ repoRoot, gitignore?, kbignore? })` and `BootstrapResult` with `scannedBeforeFilter`.
- Removal of `harnessInstructionSkipPatterns` clears the path for the Task 1 stub to be the sole source of those skip patterns.

## Implementation Notes

<details>
<summary>Guidance</summary>

- The `--include` opt-back-in inversion at `bootstrap.ts:196` is the bug the plan exists to fix — remove the branch entirely, not just the flag. Static skips become unconditional.
- For descent short-circuit: when iterating a directory in `walk`, compute the candidate's repo-root-relative posix path with a trailing slash and call `gitignore?.ignores(rel)` and `kbignore?.ignores(rel)` before recursing. This avoids walking large excluded subtrees on monorepos (plan risk callout).
- The pre-filter count for `scannedBeforeFilter` should count `.md` files the walker encountered (post `STATIC_SKIPS` directory short-circuits, pre `.gitignore` / `.kbignore` filtering). The exact definition is a judgment call; document it inline so the Task 3 diagnostic message is honest.
- Keep `runBootstrapIncremental`'s lock acquisition where it is (`bootstrap.ts:362`). Task 3 will introduce a `previewBootstrapIncremental` that runs before the lock; this task does NOT need to split that yet — but if you find the natural seam during this refactor, exposing it now is fine.
- Memory ingestion (`discoverHarnessMemoryFiles`) is explicitly out of scope for `.kbignore` filtering. Do not touch `src/lib/memory-files.ts`. The plan reversed an earlier clarification on this — memory bypasses `.kbignore`.
- Loading `.kbignore`: read the file at `<repoRoot>/.kbignore`, pass content to `ignore().add(content)`. Missing file → `undefined` (no kbignore filter), not error. The doctor check (Task 4) is where the warning lives.
- Test naming: keep new test cases under the same `discoverMarkdownFiles` describe block; old `extraStaticSkips`/`include`/`exclude` cases must be deleted, not commented out.

</details>
