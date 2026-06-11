---
id: 8
group: "usage-docs"
dependencies: [1, 3, 4, 5, 6]
status: "completed"
created: 2026-06-11
skills:
  - technical-writing
---
# Documentation: state node + AGENTS capability table

## Objective
Document the new usage ledger and the per-harness read-extraction behavior in the
AI-facing docs so the knowledge base and AGENTS.md reflect the shipped feature.

## Skills Required
`technical-writing` — concise, accurate Markdown for AI-facing docs.

## Acceptance Criteria
- [ ] The kenkeep state docs under `.ai/kenkeep/nodes/state/` describe the new `.ai/kenkeep/.state/usage.jsonl` artifact: its purpose, record shape (`document`, `type`, `session_id`, `used_at`), one-line-per-read-occurrence semantics, and the monotonic/compaction-safe reconciliation.
- [ ] `AGENTS.md` notes that capture also records knowledge-base document usage, and includes a per-harness capability table listing each harness's read-tool identifier and path field (Claude `Read`/`file_path`; Cursor `ReadFile`/`input.path`; Codex `function_call`; OpenCode part-tree; Copilot `tool.execution_start`/`view`/`arguments.path`).
- [ ] Docs match the implemented behavior (cross-checked against Tasks 1 and 3–6); no claims beyond what shipped.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
The state nodes under `.ai/kenkeep/nodes/state/` (`index.md`, `map-state-file.md`); `AGENTS.md`. Follow existing node frontmatter/schema conventions when editing nodes (verify against current files before writing).

## Input Dependencies
Tasks 1 (ledger shape) and 3–6 (per-harness read-tool identifiers).

## Output Artifacts
- Updated kenkeep state node(s) describing `usage.jsonl`.
- Updated `AGENTS.md` with the usage note and capability table.

## Implementation Notes
<details>
<summary>Step-by-step</summary>

1. Read the current `.ai/kenkeep/nodes/state/index.md` and `map-state-file.md` to match their structure, tone, and node frontmatter (these are generated/curated nodes — keep the schema valid; do not hand-edit generated index fields that a rebuild would overwrite, prefer the leaf node content).
2. Add a short section describing `usage.jsonl`: where it lives (`.state/`, gitignored), what one line is (one per read occurrence: `{document,type,session_id,used_at}`), and the monotonic reconciliation (append-only delta, never decreases, compaction-safe).
3. In `AGENTS.md`, find the capture description and add one sentence that capture also records knowledge-base document usage to `.state/usage.jsonl`. Add a compact capability table with columns: Harness | Raw source | Read tool → path field, filled from Tasks 3–6.
4. Do NOT perform the PRD/AGENTS de-Claude prose edits here — those belong to plan 50. This task only adds the usage documentation.
5. Keep it factual and brief; cross-check identifiers against the implemented extractors before finalizing.
</details>
