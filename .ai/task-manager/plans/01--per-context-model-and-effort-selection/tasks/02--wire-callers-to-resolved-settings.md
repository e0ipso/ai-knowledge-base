---
id: 2
group: "wiring"
dependencies: [1]
status: "pending"
created: 2026-05-12
skills:
  - typescript
---
# Wire three subprocess callers to read resolved model settings

## Objective
At each of the three `claude -p` subprocess sites, read the corresponding `{ name, effort }` object from `resolveSettings()` and forward `name` as `model` and `effort` as `effort` through the headless runner options. When the config key is unset, pass nothing so existing installs are unaffected.

## Skills Required
- typescript

## Acceptance Criteria
- [ ] `src/hooks/kb-stage2-drain.ts` reads `stage2Model` from resolved settings and forwards `stage2Model.name` and `stage2Model.effort` (when set) to the runner options that feed `runHeadlessClaude()`.
- [ ] `src/commands/curate.ts` reads `curatorModel` and forwards `curatorModel.name` and `curatorModel.effort` (when set) to the runner options.
- [ ] `src/commands/bootstrap-incremental.ts` reads `bootstrapModel` and forwards `bootstrapModel.name` and `bootstrapModel.effort` (when set) to the runner options.
- [ ] When the corresponding config key is absent, no `model` or `effort` field is set in the runner options (matching today's behavior).
- [ ] `npm run typecheck` and `npm run lint` pass.

## Technical Requirements
- Reuse `resolveSettings()` exactly as the existing call sites do; do not re-implement settings resolution.
- Do not introduce a CLI override flag, env var, or any user-facing API change. Config is the only knob.
- Do not duplicate the forwarding logic across files via a shared helper unless one already exists; the three sites are symmetrical and each is a few lines.

## Input Dependencies
- Task 1 must be complete: `ModelFamily`, `EffortLevel`, the three optional schema fields, and the `model`/`effort` options on `RunHeadlessOptions` / the adapter interface must all be in place.

## Output Artifacts
- Updated `src/hooks/kb-stage2-drain.ts`, `src/commands/curate.ts`, `src/commands/bootstrap-incremental.ts`.

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

For each of the three files, the pattern is identical. Locate the existing call to `resolveSettings()` (or wherever the resolved settings object is in scope before the headless runner is invoked), then forward the relevant key:

```ts
const settings = resolveSettings(/* existing args */);
const modelChoice = settings.stage2Model; // or curatorModel / bootstrapModel
// later, when building runner options:
await adapter.runHeadless({
  // ... existing options
  model: modelChoice?.name,
  effort: modelChoice?.effort,
});
```

Notes:
1. In `src/hooks/kb-stage2-drain.ts`, the Stage-2 extractor runs the headless invocation in a tight loop or single call depending on the current structure. Read `stage2Model` once outside the spawn call and forward the two optional fields. Use `stage2Model?.name` / `stage2Model?.effort` so unset stays unset.
2. In `src/commands/curate.ts`, locate where the command builds the args/options for `adapter.runHeadless()` (or whatever the call site is named after Task 1). Read `curatorModel` from resolved settings and forward both halves.
3. In `src/commands/bootstrap-incremental.ts`, same pattern with `bootstrapModel`.
4. Because the inner object schema is strict, if the value is present it is guaranteed to have both `name` and `effort` at runtime; you do not need to handle "only one half set" defensively. The runtime invariant is enforced by zod at load time (see Task 3).
5. Do not change the recursion guard, the env var pass-through, the log paths, or any other adapter behavior.
6. After wiring, run `npm run typecheck` and `npm run lint`.

</details>
