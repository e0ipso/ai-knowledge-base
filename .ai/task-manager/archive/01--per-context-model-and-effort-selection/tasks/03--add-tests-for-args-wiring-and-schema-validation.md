---
id: 3
group: "tests"
dependencies: [2]
status: "completed"
created: 2026-05-12
skills:
  - vitest
  - typescript
---
# Add tests for args wiring and schema validation of new model fields

## Objective
Cover the new behavior with meaningful integration-leaning tests: (a) the assembled `claude -p` args contain `--model <value>` and `--effort <value>` exactly when the corresponding resolved setting is present, and contain neither flag when it is absent; (b) `SettingsSchema` rejects invalid enum values and half-set `{ name, effort }` objects with a zod error.

## Skills Required
- vitest (test authoring)
- typescript

## Acceptance Criteria
- [ ] A test (or tests) in the existing `tests/` directory injects a spawn function (or uses the existing test harness pattern for `runHeadlessClaude()`) and asserts that:
  - With `stage2Model: { name: 'haiku', effort: 'low' }` in settings, the assembled args include `--model haiku` and `--effort low`.
  - With `stage2Model` absent, the assembled args include neither `--model` nor `--effort`.
  - The same coverage exists for `curatorModel` (curate command path) and `bootstrapModel` (bootstrap-incremental command path), either as discrete cases or parameterized.
- [ ] A schema test asserts that `SettingsSchema.parse(...)` rejects:
  - `{ stage2Model: { name: 'turbo', effort: 'low' } }` (invalid model family)
  - `{ stage2Model: { name: 'haiku', effort: 'turbo' } }` (invalid effort level)
  - `{ stage2Model: { name: 'haiku' } }` (missing `effort`)
  - `{ stage2Model: { effort: 'low' } }` (missing `name`)
- [ ] A schema test asserts that `SettingsSchema.parse(...)` accepts `{ stage2Model: { name: 'haiku', effort: 'low' } }` and that the three new keys are all optional (parsing succeeds with none of them set).
- [ ] `npm test` passes.

## Meaningful Test Strategy Guidelines

Your critical mantra for test generation is: "write a few tests, mostly integration".

Tests added here cover custom logic and edge cases specific to this change: args assembly given resolved settings, and zod schema rejection of invalid or half-set values. Do not write tests for zod itself, for `execa`, or for the Claude CLI; those are upstream. Combine related scenarios into single test files rather than spreading them across many.

## Technical Requirements
- Follow the existing test harness pattern in `tests/` for `runHeadlessClaude()` or the adapter (look for tests that already inject a spawn function or stub `execa`).
- Use the same matcher style already used in the suite (`toContain`, `toEqual`, `toThrow`, etc.) for consistency.
- Do not add new test dependencies.

## Input Dependencies
- Task 2 complete: the three subprocess callers must already read settings and forward `model`/`effort` to the runner; otherwise the wiring tests have nothing to assert against.

## Output Artifacts
- New or extended files under `tests/` covering args wiring and schema validation.

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. Inventory existing tests:
   - `ls tests/` and look for tests against `runHeadlessClaude`, `curate`, `bootstrap-incremental`, the Claude adapter, or `SettingsSchema`. Reuse their structure for new tests rather than inventing a new harness.
2. Args wiring test:
   - If the existing tests inject a `spawn`/`execa` stub, use the same stub. Construct a resolved-settings object (or stub `resolveSettings`) that includes one of the three new keys, run the relevant code path, and assert against the captured args array.
   - Cover at minimum the symmetrical three: stage2 (hook), curator (CLI), bootstrap-incremental (CLI). Parameterize if the suite already uses `it.each` style.
   - Add one negative case: settings with no model keys; assert `args` contains neither `--model` nor `--effort`.
3. Schema validation test:
   - Either add to an existing `schemas.test.ts` (if it exists) or create one. The test imports `SettingsSchema` and calls `.safeParse()` (preferred over `.parse()` so failure assertions don't depend on thrown error shape) on the invalid inputs listed in Acceptance Criteria and asserts `success === false`. For the valid inputs, assert `success === true`.
4. Do not test that zod produces a specific error message string; assert on `success` and, if useful, on `error.issues[0].path` so the test is robust to zod version bumps within the pinned major.
5. Run `npm test` and ensure both the new tests and the prior suite pass.

</details>
