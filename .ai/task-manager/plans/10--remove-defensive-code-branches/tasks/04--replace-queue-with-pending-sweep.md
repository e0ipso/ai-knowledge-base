---
id: 4
group: "drain"
dependencies: [3]
status: "pending"
created: 2026-05-13
skills:
  - typescript
complexity_score: 5
complexity_notes: "Largest item; deletes a file plus multiple schemas, reworks the drain body, and updates tests. Kept as one task because the changes are tightly coupled."
---
# Replace queue + retry rotation with a pending-frontmatter sweep

## Objective
Delete `.queue.json` and its surrounding machinery. Replace the drain body with a filesystem sweep that processes every `_sessions/*.md` whose frontmatter has `proposal_status: 'pending'`, marking each `done` or `failed` in place. Drain entry-point names and CLI/hook surfaces stay unchanged.

## Skills Required
- typescript: large edit across `proposal-drain.ts`, `queue.ts` (delete), `schemas.ts`, `capture.ts`, plus tests

## Acceptance Criteria
- [ ] `src/lib/queue.ts` is deleted. No source file imports from it.
- [ ] `QueueFileSchema`, `QueueEntrySchema`, and types `QueueFile`, `QueueEntry` are removed from `src/lib/schemas.ts`.
- [ ] In `src/lib/proposal-drain.ts`: `bumpAndRotate`, `removeFromQueueHead`, `DEFAULT_MAX_ATTEMPTS`, the `attempts` field, the `maxAttempts` ctx field, and the `appendToQueue` re-export are all removed.
- [ ] `drainProposalQueue` reads files under `_sessions/` via the filesystem, filters by `proposal_status: 'pending'` in frontmatter, derives `sessionId` / `capturedBy` / `capturedAt` from frontmatter, processes each, and writes `proposal_status: 'done'` on success or `'failed'` on error. `proposal_error` and `proposal_log` keep their current shape.
- [ ] The drain is capped by `maxEntries` (existing ctx field); iteration stops once the cap is hit.
- [ ] `DrainEntryStatus` no longer includes `'skipped'`. New shape is `'done' | 'failed' | 'missing-log'` (or `'done' | 'failed'` if the missing-log branch folds into `failed` cleanly — pick whichever keeps the existing call sites simpler).
- [ ] In `src/lib/capture.ts`: the `appendToQueue` / `hasQueueEntry` call block and its import are removed.
- [ ] Tests that asserted queue-file shape, rotation, or `attempts` increment are deleted or rewritten. New tests cover:
  - Drain ignores logs whose frontmatter has `proposal_status` other than `'pending'` (or absent).
  - Drain marks `done` on success.
  - Drain marks `failed` on a runner error and does not retry within the same drain.
  - Drain respects `maxEntries`.
- [ ] No reference to `.queue.json` remains in `src/`, `bin/`, `scripts/`, `.claude/`.
- [ ] `npm run lint`, `npm run typecheck`, and `npm test` pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- TypeScript, `gray-matter` (already a dependency) for frontmatter read/write, `node:fs` for directory listing.
- Vitest for tests.

## Input Dependencies
- Task 3 must complete first: it removes the dedup cache from the capture path and `.dedup-cache.json` from `_sessions/`, simplifying the "what to skip" decision in the sweep.

## Output Artifacts
- Deleted file: `src/lib/queue.ts`.
- Edits in `src/lib/proposal-drain.ts`, `src/lib/schemas.ts`, `src/lib/capture.ts`.
- Updated tests.

## Implementation Notes

<details>
<summary>Step-by-step</summary>

1. Grep first: `rg -n "queue\.ts|QueueFile|QueueEntry|appendToQueue|hasQueueEntry|removeFromQueueHead|bumpAndRotate|DEFAULT_MAX_ATTEMPTS" src/ test/ bin/ scripts/ .claude/`. Note every call site.
2. In `src/lib/proposal-drain.ts`:
   - Locate `drainProposalQueue`. Replace its body with:
     a. Resolve the sessions directory (it already does this elsewhere — reuse `sessionsDir(ctx)` or equivalent).
     b. List entries: `await readdir(sessionsDir)`, filter to files ending in `.md` and not starting with `.`.
     c. For each, parse only the frontmatter via `gray-matter` (`matter.read(path)` or `matter(await readFile(path, 'utf8'))`).
     d. Skip files whose `data.proposal_status` is not `'pending'`.
     e. Build the equivalent of the old `QueueEntry` shape on the fly: `{ sessionId: data.session_id ?? data.sessionId, capturedBy: data.captured_by, capturedAt: data.captured_at, file: path }`. Match whatever key names the current frontmatter uses (read one example session log to confirm).
     f. Call the renamed `processSessionLog` (currently `processEntry`); on success, edit the file's frontmatter to `proposal_status: 'done'` with `proposal_log` set; on thrown error, edit to `proposal_status: 'failed'` with `proposal_error` set (truncate to a reasonable length to avoid bloat).
     g. Stop once processed count reaches `ctx.maxEntries`.
   - Rename `processEntry` -> `processSessionLog` (or leave the name; rename is optional and only if it improves clarity).
   - Delete `bumpAndRotate`, `removeFromQueueHead`, `DEFAULT_MAX_ATTEMPTS`, the `attempts` parameter, the `maxAttempts` ctx field, the `appendToQueue` re-export, and any helper that wrote to `.queue.json`.
   - Remove the `'skipped'` arm from `DrainEntryStatus`. Update any call site that switched on it.
3. In `src/lib/schemas.ts`: delete `QueueFileSchema`, `QueueEntrySchema`, and exported types `QueueFile`, `QueueEntry`.
4. Delete `src/lib/queue.ts`.
5. In `src/lib/capture.ts`: delete the block (around lines 118-127 per plan) that calls `appendToQueue` / `hasQueueEntry`. Delete the corresponding import.
6. Test rewrite:
   - Locate existing drain tests. Remove assertions about queue file existence, ordering, or `attempts` increment.
   - Add fixtures: a `_sessions/` dir with mixed frontmatter — one pending, one done, one without `proposal_status`.
   - Assert: drain transitions only the pending file to `done` (or `failed` when the runner throws); does not touch the others.
   - Assert: with `maxEntries = 1`, only one pending file is processed even if two exist.
7. Run `npm run lint`, `npm run typecheck`, `npm test`. Iterate.

The `missing-log` status may still be useful if a sweep race deletes a file mid-processing; if so, retain it. Otherwise, fold into `failed`.

</details>
