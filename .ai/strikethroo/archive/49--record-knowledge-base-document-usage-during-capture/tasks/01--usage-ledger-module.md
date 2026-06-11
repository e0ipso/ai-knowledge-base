---
id: 1
group: "usage-core"
dependencies: []
status: "completed"
created: 2026-06-11
skills:
  - typescript
complexity_score: 5
complexity_notes: "Monotonic, concurrency-safe, compaction-safe reconciliation plus knowledge-base path classification is the core custom logic of the feature."
---
# Usage ledger module: schema, path, classification, monotonic reconciliation

## Objective
Build the shared, harness-agnostic usage ledger: the `.state/usage.jsonl` path, a
`UsageRecord` schema, knowledge-base read-path classification (leaf node id vs
branch `index.md` path), and a monotonic, session-keyed, concurrency-safe
reconciliation function that appends only new read occurrences and never
decreases a session's recorded counts.

## Skills Required
`typescript` — Node fs, zod schema, deterministic file reconciliation, locking.

## Acceptance Criteria
- [ ] `src/lib/paths.ts` exposes `usageFile` resolving to `<stateDir>/usage.jsonl` (i.e. `.ai/kenkeep/.state/usage.jsonl`).
- [ ] `src/lib/schemas.ts` defines and exports a `UsageRecord` zod schema: `{ document: string, type: 'leaf' | 'index', session_id: string, used_at: string }` (add `schema_version` only if consistent with the other `.state` schemas).
- [ ] `src/lib/usage.ts` exports `classifyRead(readPath, nodesDir, kkDir)` → `{ document, type } | null`: returns a record only for reads resolving under `nodesDir`; a per-folder `index.md` → `type: 'index'`, `document` = POSIX path relative to the kk root (e.g. `nodes/models/claude/index.md`); any other node file → `type: 'leaf'`, `document` = node id derived from the filename (`<id>.md` → `<id>`).
- [ ] `src/lib/usage.ts` exports `reconcileUsage(usageFile, sessionId, usedAt, classifiedReads)` that makes the count of lines per `(session_id, document)` equal `max(existingCount, observedCount)` — appends only the positive delta, never removes or decreases (post-compaction safe). Multiple identical occurrence lines are acceptable.
- [ ] Ledger writes are atomic and serialized against concurrent captures (reuse `src/lib/fs-atomic.ts` and/or the `.state` lock in `src/lib/state.ts`).
- [ ] Path matching resolves/realpaths both the read path and `nodesDir`, so absolute and relative read paths both classify correctly.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
Node `fs`; `repoPaths()` in `src/lib/paths.ts` (already exposes `stateDir`, `nodesDir`, `kkDir`); zod via `src/lib/schemas.ts`; `src/lib/fs-atomic.ts`; the lock primitive in `src/lib/state.ts` (same one `proposal-drain` uses).

## Input Dependencies
None.

## Output Artifacts
- `src/lib/usage.ts` exporting `classifyRead` and `reconcileUsage`.
- `usageFile` on `RepoPaths`.
- `UsageRecord` schema in `src/lib/schemas.ts`.
These are consumed by Task 2 (capture wiring) and Task 7 (tests).

## Implementation Notes
<details>
<summary>Step-by-step</summary>

1. **Path.** In `src/lib/paths.ts`, where the `.state` paths are built (around `stateDir`), add `usageFile: join(stateDir, 'usage.jsonl')` to the returned object and the `RepoPaths` type. It is gitignored automatically by the existing `.state/` rule — no `.gitignore` change.
2. **Schema.** In `src/lib/schemas.ts`, add `export const UsageRecordSchema = z.object({ document: z.string(), type: z.enum(['leaf','index']), session_id: z.string(), used_at: z.string() })` and `export type UsageRecord = z.infer<typeof UsageRecordSchema>`. Match the style of the existing state schemas.
3. **classifyRead(readPath, nodesDir, kkDir):**
   - Resolve both `readPath` and `nodesDir` with `path.resolve` (and `fs.realpathSync` guarded in try/catch for symlinks). If the resolved read path is not under the resolved `nodesDir`, return `null`.
   - `basename === 'index.md'` → `{ type: 'index', document: <POSIX relative path from kkDir to the file> }` (use `path.relative(kkDir, file)` then replace `\\` with `/`).
   - Otherwise (a leaf node file ending `.md`) → `{ type: 'leaf', document: basename without '.md' }`. Non-`.md` files under `nodes/` should return `null` (not knowledge documents).
4. **reconcileUsage(usageFile, sessionId, usedAt, classifiedReads):**
   - `observed` = a Map from `document` → count, built from `classifiedReads`.
   - Read existing `usageFile` (if present), parse each line as JSON, and build `existing` = Map from `document` → count, **filtered to this `session_id`**.
   - For each `document` in `observed`, compute `delta = max(0, observed.count - (existing.count ?? 0))`. Append `delta` lines `{document,type,session_id,used_at}` (type from the classified read). **Never** delete or rewrite existing lines.
   - Write via the atomic helper while holding the `.state` lock so two concurrent captures cannot interleave or lose appends. Appending under lock is sufficient; a full read-modify-write under lock is also fine given small file sizes.
   - Be robust to a malformed/partial existing line (skip it, do not throw) so a corrupt line never blocks capture.
5. Keep this module pure of harness specifics — it only sees already-classified reads and the session id/timestamp.
</details>
