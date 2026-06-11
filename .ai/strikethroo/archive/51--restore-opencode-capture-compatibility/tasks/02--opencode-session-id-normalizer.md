---
id: 2
group: "opencode-units"
dependencies: []
status: "completed"
created: 2026-06-11
skills:
  - typescript
---
# OpenCode session-id normalizer

## Objective
Add a normalizer that converts OpenCode's `ses_<base62>` session ids into a
deterministic UUID v4 (pass-through for already-valid UUID v4), so the capture
hook's `assertValidSessionId` stops throwing on current OpenCode.

## Skills Required
`typescript` — string normalization, hashing.

## Acceptance Criteria
- [ ] `src/harnesses/opencode/session-id.ts` exports `normalizeOpenCodeSessionId(id: string): string`.
- [ ] A valid UUID v4 input is returned unchanged (lowercased).
- [ ] A non-UUID input (e.g. `ses_14a1371d9ffeGsvaB7Eou769xq`) yields a deterministic UUID v4 (same input → same output) that satisfies `assertValidSessionId`.
- [ ] A focused unit test covers both branches and that the derived id passes `assertValidSessionId`; the commit leaves the suite green.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
Mirror `src/harnesses/cursor/session-id.ts` (`normalizeCursorConversationId`): same UUID v4 regex and sha256-derivation shape, namespaced for OpenCode. `assertValidSessionId` lives in `src/lib/session-log.js`.

## Input Dependencies
None.

## Output Artifacts
- `src/harnesses/opencode/session-id.ts` + its unit test. Consumed by Task 3 (wired into the capture hook).

## Implementation Notes
<details>
<summary>Steps</summary>

1. Copy the structure of `src/harnesses/cursor/session-id.ts` exactly: the `UUID_V4_RE`, pass-through for a valid UUID v4 (lowercased), else `createHash('sha256').update('opencode:' + id)` and splice the hex into a v4-shaped string (`8-4-4(4xxx)-4(8/9/a/b xxx)-12`). Use the `opencode:` namespace prefix so it never collides with Cursor's derivation.
2. Add a unit test (e.g. `tests/harnesses/opencode-session-id.test.ts`): a real UUID v4 passes through unchanged; `ses_14a1371d9ffeGsvaB7Eou769xq` → a UUID v4 (assert the regex and that `assertValidSessionId` accepts it); same input twice → same output.

**Test philosophy ("a few tests, mostly integration"):** this normalizer is custom logic with branches and a determinism guarantee — worth one small test covering both branches and stability. Do not test `createHash` itself.
</details>
