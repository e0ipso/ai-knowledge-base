---
id: 2
group: "abstraction-refactor"
dependencies: []
status: "completed"
created: 2026-05-15
skills:
  - typescript
---

# Make HookEvent the union of declared events and iterate adapter.hooks

## Objective

Today `HookEvent` is a hard-coded union of Claude's lifecycle event names. Codex supports a subset (no `SessionEnd`, no `PreCompact`), so the shared type should be the union of every event any registered adapter declares, and install/doctor code should iterate `adapter.hooks` directly rather than scanning a global enum.

## Skills Required

- typescript

## Acceptance Criteria

- [ ] `HookEvent` in `src/harnesses/types.ts` is the literal-string union of every event name actually used by any adapter (Stop, SessionStart, SessionEnd, PreCompact, UserPromptSubmit; tool events permitted but not used in v1)
- [ ] `install()` and `doctor()` paths iterate `adapter.hooks` to register/verify; no global validator requires every event to be in a canonical enum
- [ ] Claude adapter's `hook-spec.ts` is unchanged in behavior (same events declared)
- [ ] `npm run build` succeeds; `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TypeScript discriminated-string unions
- Touches `src/harnesses/types.ts`, `src/harnesses/claude/install.ts`, `src/harnesses/claude/doctor.ts`, `src/lib/hook-spec.ts` if it still has Claude-specific re-exports

## Input Dependencies

None.

## Output Artifacts

- Generalized `HookEvent` type
- Adapter-driven hook iteration

## Implementation Notes

<details>
<summary>Guidance</summary>

- Keep `HookEvent` as a permissive union of all event names ever declared by any adapter. Each adapter's `hooks` array is the source of truth for what it actually registers.
- Where the Claude adapter writes its settings.json, it filters/maps from `adapter.hooks` already; that loop remains.
- For doctor: drop any "all canonical events present" assertion. Replace with "every `adapter.hooks[i]` is registered in `settings.json` (or `.codex/hooks.json`)".
- Per `feedback_no_backwards_compat`: delete the old global enum; no compatibility alias.

</details>
