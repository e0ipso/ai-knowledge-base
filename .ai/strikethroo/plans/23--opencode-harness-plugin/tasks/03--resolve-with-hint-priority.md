---
id: 3
group: "abstraction-refactor"
dependencies: []
status: "pending"
created: 2026-05-15
skills:
  - typescript
---

# Add resolveWithHint to detect.ts implementing the --hint priority chain

## Objective

`src/harnesses/detect.ts` exposes a new `resolveWithHint(env, hint?, configDefault?)` function that codifies the priority chain shared between the CLI's internal harness resolution and the `/tmp/kb-detect-harness.mjs` script (materialized by skill bodies in Task 8). The final rule, accounting for the coverage-risk decision in the plan:

1. If `hint` is supplied and is a valid registered id, `hint` wins (hint-when-explicit beats env, per the coverage-risk mitigation).
2. Otherwise, walk `adapter.detectFromEnv?.(env)` in registry order; first truthy match wins.
3. Otherwise, `configDefault` if valid.
4. Otherwise, first registered.
5. Otherwise, throw with a helpful message.

The CLI's `resolveActiveHarness` (today: flag, env, cliDefault, first registered) is refactored to delegate to `resolveWithHint`, passing `flag` as the hint slot and reading `cliDefaultHarness` from config.

## Skills Required

- typescript

## Acceptance Criteria

- [ ] `src/harnesses/detect.ts` exports `resolveWithHint(env, hint?, configDefault?, registry?)` implementing the five-step chain
- [ ] Existing `resolveActiveHarness` delegates to `resolveWithHint`; its observable behavior on a Claude-only repo is unchanged
- [ ] Hint validation: an unknown id passed as hint is treated as if no hint was supplied (do not throw; fall through to env detection). Document this with a unit test
- [ ] Unit tests cover: (a) hint wins over env, (b) env wins when hint absent, (c) configDefault wins when both absent, (d) bogus hint falls through, (e) total absence throws with a helpful message naming `--hint` and `cliDefaultHarness`
- [ ] `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `src/harnesses/detect.ts`
- Test file under `tests/` mirroring existing detect tests if any (otherwise create `tests/detect.test.ts`)

## Input Dependencies

None.

## Output Artifacts

- `resolveWithHint` function used by both the CLI and (mirrored in plain JS by) the detect-harness skill heredoc

## Implementation Notes

<details>
<summary>Guidance</summary>

- The chain order in the plan's "--hint priority" section places env above hint for Claude (because `CLAUDECODE=1` is unambiguous) and hint above env for Codex/OpenCode (no in-session env). The simpler resolution: hint always wins when valid. This is the coverage-risk mitigation explicitly called out in the plan ("hint always wins when explicit, env is consulted only when hint is absent"). Implement that and document it in `practice-explicit-harness-flag` in Task 11.
- The heredoc script in Task 8 must mirror this exact priority for the CI lint in Task 9 to pass.
- Validation of `hint` against the registered adapter ids prevents typos from silently selecting the wrong harness.

</details>
