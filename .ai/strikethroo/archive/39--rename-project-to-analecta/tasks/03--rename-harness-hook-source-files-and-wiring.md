---
id: 3
group: "command-surface"
dependencies: []
status: "completed"
created: 2026-06-03
skills:
  - typescript
  - git
---
# Rename per-harness hook source files and wiring

## Objective
Rename the per-harness hook **source** files from `kb-*` to `ana-*` across all
four harness adapters and update any settings/registration that wires hook
command paths by filename.

## Skills Required
- **git**: `git mv` 16 hook source files to preserve history.
- **typescript**: update hook registration/settings wiring and any imports that reference the old module filenames.

## Acceptance Criteria
- [ ] All 16 hook source files are renamed via `git mv`: `src/harnesses/{claude,codex,cursor,opencode}/hooks/kb-{session-start,capture,proposal-drain,lint-tick}.ts` → `ana-*.ts`.
- [ ] Every harness `settings`/registration that references a hook command path uses the new `ana-*` filename.
- [ ] No source imports or identifiers reference the old `kb-*` hook module names.
- [ ] `npm run typecheck` passes (no broken imports).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
Hook sources are under `src/harnesses/<id>/hooks/`. Each harness adapter wires
its hooks into the harness config it emits (e.g. a `settings.ts`/registration
module that maps event → command path). Renaming the files requires syncing
those wired paths. Adapters must not reach into each other's directories — keep
edits scoped per harness.

## Input Dependencies
None. Zero-dependency Phase 1 task.

## Output Artifacts
- 16 renamed `ana-*` hook source files.
- Updated harness settings/registration referencing the new filenames.

These feed the regeneration task (re-`init` emits the deployed hook files) and
the verification task.

## Implementation Notes
<details>
<summary>Step-by-step</summary>

1. For each harness `<id>` in `claude codex cursor opencode`, rename the four
   hook files preserving history:
   - `git mv src/harnesses/<id>/hooks/kb-session-start.ts src/harnesses/<id>/hooks/ana-session-start.ts`
   - `git mv src/harnesses/<id>/hooks/kb-capture.ts src/harnesses/<id>/hooks/ana-capture.ts`
   - `git mv src/harnesses/<id>/hooks/kb-proposal-drain.ts src/harnesses/<id>/hooks/ana-proposal-drain.ts`
   - `git mv src/harnesses/<id>/hooks/kb-lint-tick.ts src/harnesses/<id>/hooks/ana-lint-tick.ts`
2. Find where each harness wires these hooks (search within
   `src/harnesses/<id>/` for `kb-session-start`, `kb-capture`,
   `kb-proposal-drain`, `kb-lint-tick`, and `kb-` generally). Update the
   command paths/filenames to `ana-*`.
3. Check `src/lib/settings.ts` and any shared hook-registration code for
   filename references and update them.
4. Update any `import`/`require` statements that pointed at the renamed files.
5. `grep -rIn -e 'kb-session-start' -e 'kb-capture' -e 'kb-proposal-drain' -e 'kb-lint-tick' src`
   and confirm only intentional matches remain (none expected in source).
6. Run `npm run typecheck` and confirm no unresolved-module errors.
</details>
