---
id: 2
group: "usage-core"
dependencies: [1]
status: "completed"
created: 2026-06-11
skills:
  - typescript
complexity_score: 5
complexity_notes: "Touches the shared adapter contract and the capture pipeline; must be non-fatal and not assume captureSession holds the raw transcript (OpenCode)."
---
# Adapter read-extraction contract + shared capture invocation

## Objective
Add a first-class, optional read-extraction capability to the `HarnessAdapter`
contract (peer of `parseTranscript`), and wire the shared capture pipeline so
that, after the session log is written, classified knowledge-base reads are
reconciled into the usage ledger — invoked at the adapter/hook layer so it works
even for harnesses (OpenCode) whose hook strips tool data before
`captureSession`.

## Skills Required
`typescript` — interface design, capture pipeline plumbing.

## Acceptance Criteria
- [ ] `src/harnesses/types.ts` declares an optional adapter capability that returns the file paths read via tool calls from the harness's native raw source (return type `string[]`; absent/empty ⇒ no usage). Documented as parallel to `parseTranscript`/`listMemoryFiles`, with the empty result being a supported, defensive fallback.
- [ ] `src/lib/capture.ts` accepts the extracted read paths (and `nodesDir` + `usageFile`) and, **after** the session-log write, calls `classifyRead` + `reconcileUsage` (Task 1) with the session's `session_id` and `captured_at` as `used_at`.
- [ ] Usage collection is **non-fatal**: any error in extraction/classification/reconciliation is caught and logged (via the existing hook-diagnostic path) and never changes the `CaptureResult` status or blocks the session-log write.
- [ ] The wiring does not assume the raw transcript is available inside `captureSession`; read paths are passed in by the caller (the per-harness hook), not re-derived from the rendered text.
- [ ] Existing capture behavior and the session-log output are unchanged when no extractor/usage sink is supplied.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
`src/harnesses/types.ts` (`HarnessAdapter`, and the `CaptureContext`/`HookInput` types in `src/lib/capture.ts`); `src/lib/capture.ts` (`captureSession`, `CaptureContext`); `usageFile` + `classifyRead`/`reconcileUsage` from Task 1; `repoPaths().nodesDir`.

## Input Dependencies
Task 1 (`usage.ts` classify/reconcile, `usageFile` path, `UsageRecord` schema).

## Output Artifacts
- Extended `HarnessAdapter` contract (read-extraction method signature).
- Extended `CaptureContext` and `captureSession` that reconcile usage after writing the log.
Consumed by Tasks 3–6 (each adapter supplies its extractor through its hook) and Task 7 (tests).

## Implementation Notes
<details>
<summary>Step-by-step</summary>

1. **Contract.** In `src/harnesses/types.ts`, add an optional method to `HarnessAdapter`, e.g. `extractNodeReads?(...): string[]` returning absolute/relative file paths the agent opened via read tools. Keep the input flexible: text-based adapters parse a raw string; OpenCode (Task 6) extracts from its storage tree. The simplest contract that works for all is a per-adapter function the **hook** calls with whatever native source it holds, returning `string[]`. Document that returning `[]` is valid (defensive fallback) and that callers must filter to the node tree via Task 1's classifier (not the adapter).
2. **CaptureContext.** In `src/lib/capture.ts`, extend `CaptureContext` with optional fields needed for usage: the read paths for this capture (or a thunk to compute them), `nodesDir`, `kkDir`, and `usageFile`. The cleanest split: the hook computes `readPaths: string[]` and passes them in, so `captureSession` stays harness-agnostic.
3. **Invocation point.** After `writeSessionLog(...)` succeeds (around `src/lib/capture.ts:115`), if usage inputs are present: map `readPaths` through `classifyRead(path, nodesDir, kkDir)`, drop nulls, then call `reconcileUsage(usageFile, sessionId, capturedAt, classified)`. Use the same `capturedAt` already computed at `capture.ts:76` as `used_at`.
4. **Non-fatal.** Wrap the whole usage block in try/catch; on error, append a hook diagnostic and continue. Never alter the returned `CaptureResult`.
5. **No behavior change when unused.** Guard the block so existing callers/tests that do not pass usage inputs behave exactly as before.
6. Note: capture already short-circuits when `KENKEEP_BUILDER_INTERNAL=1`, so kenkeep's own headless node reads are excluded for free — no extra handling needed.
</details>
