---
id: 5
group: "conventions"
dependencies: []
status: "completed"
created: 2026-06-03
skills:
  - typescript
---
# Rebrand conventions: env vars, ignore file, OpenCode dir, status label

## Objective
Rebrand the remaining internal identifiers so the codebase is self-consistent:
the two environment variables, the `.kbignore` filter file (and its generator),
the OpenCode emitted hooks directory, and the hook status-line label.

## Skills Required
- **typescript**: edit env-var setters/readers, the ignore-file generator + path constants, the build pipeline's OpenCode branch, and status-line strings.

## Acceptance Criteria
- [ ] `KB_BUILDER_INTERNAL` → `ANALECTA_BUILDER_INTERNAL` and `KB_GITIGNORE_LINES` → `ANALECTA_GITIGNORE_LINES` are renamed atomically across **every** setter and reader.
- [ ] `.kbignore` → `.anaignore` in the generator, the path constants, and `init`. The generator module `src/lib/kbignore-stub.ts` is renamed (via `git mv`) to `anaignore-stub.ts` and its importers updated.
- [ ] The build pipeline's OpenCode branch (`scripts/build-templates.mjs`) emits `ana-hooks/` instead of `kb-hooks/`.
- [ ] Hook status-line messages use the `ana` label instead of `KB`.
- [ ] `grep -rIn -e 'KB_BUILDER_INTERNAL' -e 'KB_GITIGNORE_LINES' -e 'kbignore' -e 'kb-hooks' src scripts` returns no functional matches.
- [ ] `npm run typecheck` passes.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Env vars: only two distinct identifiers exist despite many raw `KB_` hits.
  Both the process that **sets** them on harness children and every process
  that **reads** them must change together (atomic) or the recursion guard
  breaks.
- Ignore file: generator at `src/lib/kbignore-stub.ts`, plus any path-constant
  module and the `init` flow.
- OpenCode dir: keep avoiding the runtime-reserved `.opencode/hooks/`; the
  emitted dir becomes `ana-hooks/`.

## Input Dependencies
None. Zero-dependency Phase 1 task.

## Output Artifacts
- Renamed env vars everywhere; `anaignore-stub.ts` emitting `.anaignore`;
  build pipeline emitting `ana-hooks/`; `ana` status label.

Feeds the regeneration task and the verification task. The renamed env vars
must be kept in sync with the `lint:detect-harness` ENV_DETECTORS heredoc
(handled in the tests/guard task).

## Implementation Notes
<details>
<summary>Step-by-step</summary>

1. Env vars — find all occurrences:
   `grep -rIn -e 'KB_BUILDER_INTERNAL' -e 'KB_GITIGNORE_LINES' src scripts`.
   Replace `KB_BUILDER_INTERNAL` → `ANALECTA_BUILDER_INTERNAL` and
   `KB_GITIGNORE_LINES` → `ANALECTA_GITIGNORE_LINES` in every setter (the code
   that sets the var on the spawned harness child) and every reader. They must
   change in the same task to avoid a broken recursion guard.
2. Ignore file generator: `git mv src/lib/kbignore-stub.ts src/lib/anaignore-stub.ts`.
   Inside it, change the emitted filename and any content from `.kbignore` to
   `.anaignore`. Update all importers of that module (search for
   `kbignore-stub`). Update any path-constant module and the `init` flow that
   references `.kbignore`.
3. OpenCode build branch: in `scripts/build-templates.mjs`, find where the
   OpenCode adapter emits `kb-hooks/` and change it to `ana-hooks/`.
4. Status-line label: search hook code (e.g. session-start / status-line
   emitter) for the `KB` label printed after the emoji and change it to `ana`.
   `grep -rIn "KB" src/harnesses` to locate the label string specifically.
5. Verify: `grep -rIn -e 'KB_BUILDER_INTERNAL' -e 'KB_GITIGNORE_LINES' -e 'kbignore' -e 'kb-hooks' src scripts`
   returns nothing functional. Run `npm run typecheck`.
</details>
