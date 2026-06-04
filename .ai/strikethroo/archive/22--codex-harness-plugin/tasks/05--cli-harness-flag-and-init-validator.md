---
id: 5
group: "abstraction-refactor"
dependencies: []
status: "completed"
created: 2026-05-15
skills:
  - typescript
---

# Add --harness CLI flag, broaden init validator, update resolver chain

## Objective

Add a top-level `--harness <id>` option to the Commander program in `src/cli.ts`. Update `resolveActiveHarness` to consult that flag first. Drop the "must include claude" check in `init --harnesses`, allowing any non-empty subset of registered harnesses.

## Skills Required

- typescript

## Acceptance Criteria

- [ ] `src/cli.ts` registers a top-level `--harness <id>` option that every subcommand inherits (use Commander's `program.option(...)` or per-command `option`)
- [ ] `resolveActiveHarness` accepts an explicit `flag?: string` argument; resolution order becomes: (1) `flag`, (2) env detection, (3) `cliDefault` from `config.yaml`, (4) first registered
- [ ] Every command entry point (`runCurate`, `runBootstrapIncremental`, `runDoctor`, `runLint`, etc.) reads the global `--harness` option from `program.opts()` and threads it to `resolveActiveHarness`
- [ ] `validateHarnesses` in `src/commands/init.ts` rejects only empty lists and unknown ids; the `'claude'` required check is removed
- [ ] Unknown `--harness` flag values produce a clear error: `Unsupported harness 'X'. Supported: claude, codex.`
- [ ] `npm run build` succeeds; `npm test` passes (update existing tests for `validateHarnesses` that asserted the claude-required behavior)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Commander 11+ (already used)
- `src/cli.ts`, `src/commands/*.ts`, `src/harnesses/detect.ts`

## Input Dependencies

None.

## Output Artifacts

- Global `--harness` flag on the CLI
- Updated `resolveActiveHarness` signature
- Loosened `validateHarnesses`

## Implementation Notes

<details>
<summary>Guidance</summary>

- In Commander, a top-level option declared on `program` is accessible via `program.opts().harness` from any action handler. Pass it explicitly into each runner instead of reading globals inside the runner.
- `resolveActiveHarness({ flag, env, cliDefault })`: validate `flag` is a registered harness before returning; throw with a helpful message otherwise.
- `init` does NOT use `resolveActiveHarness` — it consumes `--harnesses` (the multi-value installer list). Keep them distinct.
- Per `feedback_no_backwards_compat`: drop the `'claude'`-required validator branch outright. The `--harnesses` option's `description` string should be updated to reflect supported values dynamically (`listHarnessIds().join(', ')`).

</details>
