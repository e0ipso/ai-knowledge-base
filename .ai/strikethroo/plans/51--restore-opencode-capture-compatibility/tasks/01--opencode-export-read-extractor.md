---
id: 1
group: "opencode-units"
dependencies: []
status: "completed"
created: 2026-06-11
skills:
  - typescript
---
# OpenCode export-parts read extractor

## Objective
Replace the dead file-tree `extractOpenCodeReads` with one that extracts
knowledge-base read paths from the `opencode export` JSON (`messages[].parts[]`),
matching the verified v1.17.3 read-tool shape.

## Skills Required
`typescript` — JSON traversal, defensive parsing.

## Acceptance Criteria
- [ ] `src/harnesses/read-extract.ts` exports an OpenCode extractor that takes the parsed `opencode export` document (or its `messages` array) and returns read file paths in order, preserving duplicates.
- [ ] It keeps only parts where `type === 'tool' && tool === 'read'` and returns `state.input.filePath` (defensive: also accept `path`/`file_path`; ignore parts of any other type or tool).
- [ ] The old file-tree signature `extractOpenCodeReads(storageDir, sessionId)` is removed; no caller or test references it afterward (the hook caller is rewired in Task 3).
- [ ] The OpenCode block in `tests/harnesses/read-extract.test.ts` is updated to an export-JSON fixture and passes (the commit leaves the full suite green).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
`src/harnesses/read-extract.ts` (reuse the existing `firstStringField` helper and the `OPENCODE_READ_TOOLS` set); `tests/harnesses/read-extract.test.ts`.

## Input Dependencies
None.

## Output Artifacts
- Export-based OpenCode read extractor in `read-extract.ts`, consumed by Task 3's hook rewire.

## Implementation Notes
<details>
<summary>Verified shape and steps</summary>

Measured `opencode export <id>` output (OpenCode v1.17.3):
`{ "info": {...}, "messages": [ { ..., "parts": [ {"type":"tool","tool":"read","state":{"input":{"filePath":"/workspace/src/lib/kkignore-stub.ts"}}}, {"type":"text",...}, {"type":"tool","tool":"bash",...} ] } ] }`.

1. Change the export of `extractOpenCodeReads` to take the parsed export object: `extractOpenCodeReads(exportJson: unknown): string[]`. Defensively read `exportJson.messages` (array; else `[]`), each message's `parts` (array; else skip).
2. For each part: if `part.type === 'tool' && part.tool === 'read'`, push `firstStringField(part.state?.input, ['filePath','path','file_path'])` when non-null. Preserve duplicates (multiple reads count multiply).
3. Remove the old file-tree implementation (the `storageDir`/`message`/`part` directory walk) and the now-unused `fs`/`join` imports if nothing else needs them in this file.
4. Update `tests/harnesses/read-extract.test.ts`: replace the storage-tree `beforeEach` fixture with an inline export object containing one `read` tool part (with `state.input.filePath`), one non-read tool part (`bash`), and a `text` part; assert the extractor returns just the read filePath. Keep an empty/`{}` input → `[]` case.

**Test philosophy ("a few tests, mostly integration"):** test *this* custom extraction logic (read-part filtering + path field), not JSON.parse or the framework. One fixture-driven happy path plus the empty case is sufficient; do not enumerate every part type.
</details>
