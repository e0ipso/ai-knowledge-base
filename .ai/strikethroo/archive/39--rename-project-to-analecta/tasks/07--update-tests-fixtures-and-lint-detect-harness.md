---
id: 7
group: "verification"
dependencies: [2, 3, 4, 5]
status: "completed"
created: 2026-06-03
skills:
  - vitest
  - typescript
---
# Update test sources, fixtures, and the lint:detect-harness drift guard

## Objective
Update the existing test suite, fixtures, and the `lint:detect-harness` drift
guard to the renamed identifiers/paths/env vars/skills/ignore-file. **No new
test coverage is added** — behavior is unchanged; this is a rename sync.

## Skills Required
- **vitest**: rename test files and update assertions in the existing suites.
- **typescript**: keep `scripts/lint-detect-harness.mjs` and its ENV_DETECTORS heredoc in sync with the renamed skill and env vars.

## Acceptance Criteria
- [ ] These test files are renamed (via `git mv`) and their assertions updated: `tests/hooks/kb-capture.test.ts`, `tests/hooks/kb-proposal-drain.test.ts`, `tests/hooks/kb-lint-tick.test.ts`, `tests/hooks/cursor/kb-capture.test.ts`, `tests/hooks/codex/kb-capture.test.ts` → `ana-*`.
- [ ] Assertions referencing old names/paths (`.ai/knowledge-base`), env vars (`KB_*`), the ignore file (`.kbignore`), and skill names (`kb-*`) are updated to the new values.
- [ ] `scripts/lint-detect-harness.mjs` points at `ana-curate/SKILL.md` and its ENV_DETECTORS heredoc reflects `ANALECTA_BUILDER_INTERNAL`/`ANALECTA_GITIGNORE_LINES`.
- [ ] Fixtures (transcripts, bootstrap docs) embedding old identifiers are updated.
- [ ] `npm test` passes for the renamed suites and `npm run lint` (including `lint:detect-harness`) passes.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
The drift guard couples the curate skill's ENV_DETECTORS heredoc with the
adapter code; the skill rename (task 2) and the env-var rename (task 5) must
both be reflected here as a paired edit, or `lint:detect-harness` fails.

## Input Dependencies
- Task 2 (renamed skills, CLI name, LauncherSkill type).
- Task 3 (renamed hook source files).
- Task 4 (`.ai/analecta` runtime paths).
- Task 5 (renamed env vars, `.anaignore`, `ana-hooks/`, status label).

## Output Artifacts
- Renamed `ana-*` test files with updated assertions.
- Updated `scripts/lint-detect-harness.mjs` + ENV_DETECTORS heredoc.
- Updated fixtures.

## Implementation Notes
**Test philosophy — "write a few tests, mostly integration":** Meaningful tests
verify custom business logic, critical paths, and edge cases specific to this
application — test *your* code, not the framework or library. Write tests for
custom business logic and algorithms, critical workflows and data
transformations, edge/error conditions for core functionality, integration
points, and complex validation. Do **not** write tests for third-party/framework
features, simple CRUD without custom logic, trivial getters/setters or static
config, or obvious functionality that would break immediately if wrong. Combine
related scenarios into a single test; favor integration/critical-path coverage
over per-method unit tests. **For this task specifically: do not add new tests
— only rename existing files and update assertions to the new identifiers.**

<details>
<summary>Step-by-step</summary>

1. Rename test files preserving history:
   - `git mv tests/hooks/kb-capture.test.ts tests/hooks/ana-capture.test.ts`
   - `git mv tests/hooks/kb-proposal-drain.test.ts tests/hooks/ana-proposal-drain.test.ts`
   - `git mv tests/hooks/kb-lint-tick.test.ts tests/hooks/ana-lint-tick.test.ts`
   - `git mv tests/hooks/cursor/kb-capture.test.ts tests/hooks/cursor/ana-capture.test.ts`
   - `git mv tests/hooks/codex/kb-capture.test.ts tests/hooks/codex/ana-capture.test.ts`
2. In those files and any other test, update imports of the renamed hook modules
   (`ana-*`), and update assertions/strings referencing `.ai/knowledge-base`,
   `KB_BUILDER_INTERNAL`, `KB_GITIGNORE_LINES`, `.kbignore`, `kb-bootstrap`,
   `kb-curate`, `kb-add`, `kb-hooks`, and the `KB` status label.
3. Edit `scripts/lint-detect-harness.mjs`: change the checked path from
   `kb-curate/SKILL.md` to `ana-curate/SKILL.md`; update the ENV_DETECTORS
   heredoc so the env-var names match `ANALECTA_BUILDER_INTERNAL` /
   `ANALECTA_GITIGNORE_LINES` (keep it byte-for-byte consistent with
   `detectFromEnv`).
4. Update fixtures: `grep -rIln -e 'kb-' -e 'knowledge-base' -e '\.kbignore' -e 'KB_' tests`
   (and any `fixtures/` dir) and update transcript/bootstrap-doc fixtures that
   embed old identifiers.
5. Run `npm test` (renamed suites green) and `npm run lint` (including
   `lint:detect-harness`).
</details>
