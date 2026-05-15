---
id: 3
group: "abstraction-refactor"
dependencies: []
status: "pending"
created: 2026-05-15
skills:
  - typescript
---

# Replace HeadlessRunOptions with adapter-opaque harnessOpts blob

## Objective

`HeadlessRunOptions` currently carries Claude-only fields (`allowedTools`, `model: ModelFamily`, `effort: EffortLevel`). Replace it with a generic shape that has only harness-neutral options plus an opaque `harnessOpts` blob each adapter validates with its own Zod schema. Move `allowedTools`/`model`/`effort` into the Claude adapter's `harnessOpts`.

## Skills Required

- typescript

## Acceptance Criteria

- [ ] `HeadlessRunOptions` in `src/harnesses/types.ts` matches:
  ```ts
  {
    timeoutMs?: number;
    logFile?: string;
    env?: NodeJS.ProcessEnv;
    onMessage?: (msg: HeadlessStreamMessage) => void;
    harnessOpts?: Record<string, unknown>;
  }
  ```
- [ ] `HarnessAdapter` gains a `buildHarnessOpts(settings)` helper used by the curate/bootstrap wrappers to construct `harnessOpts` from the loaded settings
- [ ] Claude adapter's `runHeadless` reads `harnessOpts.model`, `harnessOpts.effort`, `harnessOpts.allowedTools` and validates them with a Claude-specific Zod schema at the start of the call
- [ ] No more imports of `ModelFamily`/`EffortLevel` from outside `src/harnesses/claude/` (and the schema module itself)
- [ ] Callers in `src/lib/curate.ts`, `src/lib/bootstrap.ts`, `src/lib/proposal-drain.ts` route through `adapter.buildHarnessOpts` rather than passing `model`/`effort`/`allowedTools` directly
- [ ] `npm run build` succeeds; `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TypeScript; Zod schemas for per-harness opts
- Calls fan out to `src/lib/curate.ts`, `src/lib/bootstrap.ts`, `src/lib/proposal-drain.ts`, and any other `runHeadless` consumer

## Input Dependencies

None (but coordinates with Task 4 which redoes the settings schema; both can be done in parallel as long as the wrapper-glue conventions agree).

## Output Artifacts

- Generalized `HeadlessRunOptions`
- `adapter.buildHarnessOpts(settings)` on every adapter
- Claude-local validation of `harnessOpts`

## Implementation Notes

<details>
<summary>Guidance</summary>

- Define a `ClaudeHarnessOptsSchema` Zod object inside `src/harnesses/claude/headless.ts` (or a sibling `schemas.ts` in the Claude dir). Validate `harnessOpts` at the top of `runHeadless`.
- `buildHarnessOpts(settings)` for Claude picks the entry from `settings.proposalModel` / etc. whose discriminator matches `'claude'` (paired with Task 4).
- Wrapper code (curate/bootstrap) just calls `adapter.buildHarnessOpts(settings)` and passes the result through; it does not look inside.
- Per `feedback_no_backwards_compat`: do not keep top-level `model`/`effort`/`allowedTools` fields as aliases.

</details>
