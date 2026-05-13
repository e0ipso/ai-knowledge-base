---
id: 6
group: "session-id"
dependencies: [4]
status: "completed"
created: 2026-05-13
skills:
  - typescript
---
# Single assertValidSessionId boundary check; drop the three cleansers

## Objective
Validate `session_id` once at the hook entry point with a strict UUID v4 check; use the raw value verbatim downstream. Delete `shortSessionId`, the dash-tolerant cleanser in `proposal-drain.ts`, and the `hash.slice(7, 19)` fallback in `capture.ts`.

## Skills Required
- typescript: edits across `session-log.ts`, `capture.ts`, `proposal-drain.ts`, hook entry points, and tests

## Acceptance Criteria
- [ ] A single `assertValidSessionId(sessionId: unknown): string` helper exists (in `src/lib/session-log.ts` or a new `src/lib/session-id.ts`). It throws on non-string, empty, or non-UUID-v4-shaped input and returns the lowercased string otherwise.
- [ ] The UUID v4 regex is `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`.
- [ ] The hook entry point (where `captureSession` is invoked) calls `assertValidSessionId` and passes the validated string downstream.
- [ ] `shortSessionId` is deleted from `src/lib/session-log.ts`. No source file imports it.
- [ ] `buildSessionLogFilename` and `findSessionLogBySessionId` use the full sessionId in the filename pattern (e.g. `YYYYMMDD-HHmm-<sessionId>.md`). The existing tests are updated to the new pattern.
- [ ] In `src/lib/capture.ts`: the `?? hash.slice(7, 19)` fallback at line 99 (per plan) is gone; `sessionId` flows in already validated. Any local `hash` computation used solely for this fallback is deleted.
- [ ] In `src/lib/proposal-drain.ts`: `proposalLogPath` (lines 232-236 per plan) uses `sessionId` verbatim; the regex sanitisation is removed.
- [ ] Unit tests cover: rejects empty string, rejects non-string (`null`, `undefined`, number), rejects non-UUID strings (`"not-a-uuid"`, UUID v7-shaped), accepts a valid v4, returns lowercased.
- [ ] `npm run lint`, `npm run typecheck`, and `npm test` pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- TypeScript edits spanning session-log, capture, proposal-drain, and the hook entry point.
- Vitest tests.

## Input Dependencies
- Task 4 must complete first: it rewrites `proposal-drain.ts` substantially (drain body, helpers) and `capture.ts` (removes queue calls). Landing the sessionId boundary on the simplified surface avoids merge churn.

## Output Artifacts
- New helper `assertValidSessionId`.
- Edits in `src/lib/session-log.ts`, `src/lib/capture.ts`, `src/lib/proposal-drain.ts`, and the hook entry point (`src/lib/session-start.ts` or wherever `captureSession` is invoked — verify in code).
- Updated tests; possibly updated fixture filenames if tests assert on session log filenames.

## Implementation Notes

<details>
<summary>Step-by-step</summary>

1. Pick a home for the helper. If `session-log.ts` is small, add it there; otherwise create `src/lib/session-id.ts` and re-export from there.
2. Implement:
   ```ts
   const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

   export function assertValidSessionId(sessionId: unknown): string {
     if (typeof sessionId !== 'string' || sessionId.length === 0) {
       throw new Error('session_id must be a non-empty string');
     }
     if (!UUID_V4_RE.test(sessionId)) {
       throw new Error(`session_id "${sessionId}" is not a UUID v4`);
     }
     return sessionId.toLowerCase();
   }
   ```
3. Wire the call at the hook entry point. Find where the hook payload is received and `captureSession` (or the drain entry) is invoked. Validate `payload.session_id` there. After this point downstream code can assume a valid sessionId.
4. In `src/lib/session-log.ts`:
   - Delete `shortSessionId`.
   - Update `buildSessionLogFilename` to embed the full `sessionId`. Pattern: `YYYYMMDD-HHmm-<sessionId>.md`.
   - Update `findSessionLogBySessionId` to match on the full sessionId.
5. In `src/lib/capture.ts`:
   - Remove the `hash.slice(7, 19)` fallback (line ~99). If `hash` was computed solely for this, remove that too.
   - Use the validated `sessionId` verbatim.
6. In `src/lib/proposal-drain.ts`:
   - In `proposalLogPath` (around lines 232-236), drop the regex cleanse; use `sessionId` verbatim.
7. Pre-flight check: before deleting `shortSessionId`, run `rg -n "shortSessionId" src/ test/ bin/ scripts/ .claude/` to confirm all call sites are caught.
8. Tests:
   - New unit tests for `assertValidSessionId` (cases listed in Acceptance Criteria).
   - Update `buildSessionLogFilename` / `findSessionLogBySessionId` tests to the new full-sessionId filename pattern.
   - Update any test fixture filenames in the test data directory.
9. Risk check (per plan): grep test fixtures and any archived session logs for non-v4 UUIDs. If any exist, surface to the reviewer before merging; the regex may need to relax to the looser 8-4-4-4-12 hex shape. Default is strict v4.
10. Run `npm run lint`, `npm run typecheck`, `npm test`.

</details>
