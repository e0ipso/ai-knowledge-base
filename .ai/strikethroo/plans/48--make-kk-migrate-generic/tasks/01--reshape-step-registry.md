---
id: 1
group: "dispatch-core"
dependencies: []
status: "completed"
created: 2026-06-09
skills:
  - typescript-node-cli
  - vitest
---
# Reshape MigrationStep into a declarative step registry and unit-test planMigration

## Objective
Turn the orphaned `MigrationStep` interface in `src/lib/migrate.ts` into the declarative registry the new `migrate status` dispatch will consume: drop the dead `run()`/`requiresHarness` members, add a stable step identifier and primitive metadata, export a module-level registry constant with exactly one entry (`flat-to-tree`, 1 → 2), and give the now load-bearing `planMigration` unit coverage.

## Skills Required
- `typescript-node-cli` — reshaping an exported interface and constant in the project's Node ESM library code.
- `vitest` — unit tests for the chain-resolution logic.

## Acceptance Criteria
- [ ] `MigrationStep` (src/lib/migrate.ts) is purely declarative: `from`, `to`, a stable step `id` (string, value `flat-to-tree` for the existing step), and the CLI primitives that drive the step; `run()` and `requiresHarness` are gone.
- [ ] A module-level registry constant (e.g. `MIGRATION_STEPS`) is exported with exactly one entry: `flat-to-tree`, from 1, to 2, driven by the `place inventory` and `place apply` primitives. No speculative second entry.
- [ ] `planMigration`'s chain-walking logic and its throw-on-gap behavior are kept verbatim (only the parameter type changes with the interface).
- [ ] Doc comments are rewritten to describe the actual consumer: `MigrationStep`/registry docs state that steps are executed in-host by the `kk-migrate` skill via CLI primitives (never by the CLI), that every step's primitives must refuse to run unless the on-disk version equals the step's `from`, and that adding a registry entry requires a matching SKILL.md procedure section plus a `<!-- Version -->` bump. The stale "dispatcher refuses unless `--harness`" narrative is removed.
- [ ] New `tests/lib/migrate.test.ts` covers `planMigration`: single-step chain (1 → 2 returns the one step), multi-hop chain over synthetic steps (e.g. 1 → 2 → 3 resolved in order from 1), and the gap error (no step from the current version throws the `No step from schema_version X toward Y.` message).
- [ ] `npm run build` and the full test suite pass; nothing still references `run()` or `requiresHarness` (grep the repo to confirm — today nothing imports them, so compile success plus a clean grep is sufficient).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- File under change: `src/lib/migrate.ts` (interface at lines 11–22, `planMigration` at lines 98–114). `detectSchemaVersion` is reused as-is — do not touch it.
- New test file: `tests/lib/migrate.test.ts`, plain unit tests (no sandbox/CLI spawn needed — `planMigration` is pure).
- Keep the project's existing code style (ESM imports with `.js` suffixes, readonly members, doc-comment density matching the file).

## Input Dependencies
None. `MigrationStep`/`planMigration` are currently dead code (nothing imports them), so this reshape cannot break callers.

## Output Artifacts
- The reshaped `MigrationStep` interface and exported step registry constant, consumed by task 2 (`migrate status`) and task 3 (the `place` gates).
- `tests/lib/migrate.test.ts` with chain-resolution coverage.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

Current shape to replace (src/lib/migrate.ts:11–22):

```ts
export interface MigrationStep {
  readonly from: number;
  readonly to: number;
  readonly requiresHarness: boolean;
  run(): Promise<string[]>;
}
```

Target shape (names indicative; keep them simple and declarative):

```ts
export interface MigrationStep {
  /** Stable step identifier, matched against SKILL.md procedure sections. */
  readonly id: string;
  readonly from: number;
  readonly to: number;
  /** The deterministic CLI primitives the in-host skill drives for this step. */
  readonly primitives: readonly string[];
}

export const MIGRATION_STEPS: readonly MigrationStep[] = [
  { id: 'flat-to-tree', from: 1, to: 2, primitives: ['place inventory', 'place apply'] },
];
```

- `planMigration` keeps its exact loop and error message; only its docstring changes. Its new docstring should say it resolves the ordered pending chain for `migrate status` (the dispatch primitive), not for an in-CLI dispatcher.
- The registry doc comment is the designated home (per the plan's risk mitigations) for two rules binding future steps: (1) a step's primitives must refuse unless the detected on-disk version equals the step's `from`; (2) adding an entry requires a matching per-step procedure section in the kk-migrate SKILL.md and a `<!-- Version -->` bump there.
- Tests: construct synthetic `MigrationStep[]` arrays inline for the multi-hop and gap cases; use the real `MIGRATION_STEPS` for the single-step case (assert id `flat-to-tree`, from 1, to 2). Follow the style of other pure-lib tests in `tests/lib/`.

Test philosophy (apply when writing the tests): write a few meaningful tests, mostly integration-level value. Test custom business logic, critical paths, and edge cases of *this* code — here, the chain resolution (single step, multi-hop ordering, loud gap failure) is the custom logic that becomes load-bearing. Do not test the framework, trivial getters, or static configuration; do not add one test per method. Combine related scenarios into the single test file.

</details>
