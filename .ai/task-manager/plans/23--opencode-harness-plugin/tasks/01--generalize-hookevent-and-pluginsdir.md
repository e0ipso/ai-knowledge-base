---
id: 1
group: "abstraction-refactor"
dependencies: []
status: "completed"
created: 2026-05-15
skills:
  - typescript
---

# Generalize HookEvent to opaque string and add HarnessPaths.pluginsDir

## Objective

Two coupled type changes in `src/harnesses/types.ts` that make the abstraction honest about OpenCode's plugin-shaped extension surface so the OpenCode adapter is a pure addition:

1. `HookEvent` becomes opaque `string` (today a literal union of Claude/Codex event names). Each adapter declares its own event vocabulary.
2. `HarnessPaths` gains an optional `pluginsDir?: string` field. Claude/Codex leave it `undefined`; OpenCode will set it to `<root>/.opencode/plugins/`.

Install and doctor consumers continue iterating `adapter.hooks` directly without relying on the canonical event names.

## Skills Required

- typescript

## Acceptance Criteria

- [ ] `HookEvent` in `src/harnesses/types.ts` is `string` (no literal union)
- [ ] `HarnessPaths` in `src/harnesses/types.ts` has optional `pluginsDir?: string`
- [ ] Claude adapter's `hook-spec.ts` still compiles and declares its existing event names as plain strings
- [ ] Codex adapter's `hook-spec.ts` still compiles and declares its existing event names as plain strings
- [ ] No file in `src/` narrows a value to one of the old literal event names via type narrowing (use grep to verify)
- [ ] Any place that previously enumerated a global canonical event list to validate is replaced with iteration over `adapter.hooks`
- [ ] `npm run build` succeeds; `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TypeScript types in `src/harnesses/types.ts`
- Consumers in `src/harnesses/claude/install.ts`, `src/harnesses/claude/doctor.ts`, `src/harnesses/codex/install.ts`, `src/harnesses/codex/doctor.ts`, and any shared helpers in `src/lib/`

## Input Dependencies

None.

## Output Artifacts

- Opaque `HookEvent` type
- `HarnessPaths.pluginsDir` available for adapters that need it
- Install/doctor code paths driven by `adapter.hooks` rather than a canonical event enum

## Implementation Notes

<details>
<summary>Guidance</summary>

- The change is purely additive at runtime; behavior of Claude and Codex must be unchanged. Verify by running `npm test` and the existing self-validation flows from plan 22.
- Per `feedback_no_backwards_compat`: delete the old union, no compatibility alias, no exported `KnownHookEvent` constant.
- Do not introduce a `pluginsDir` default value at the type level. It is `string | undefined`. Each adapter sets it explicitly in its `paths(root)` function.
- For install/doctor, keep the `pluginsDir` consultation minimal: branches that check `paths.hooksDir` should now check `paths.pluginsDir ?? paths.hooksDir` only where the operation is "where do I write extension code". This task does NOT yet add OpenCode-specific install logic; the field just becomes available.

</details>
