---
id: 9
group: "codex-adapter"
dependencies: [7]
status: "pending"
created: 2026-05-15
skills:
  - typescript
  - unit-testing
---

# Codex rollout JSONL transcript parser

## Objective

Implement `src/harnesses/codex/transcript.ts` with `parseTranscript(text: string): RoleTaggedTranscript`. Walk each JSONL line; for each, switch on `type` (`session_meta` | `response_item` | `event_msg`) and emit a `{role, text}` turn per the rules in the plan. Wire it into the Codex adapter. Promote the shared `renderRoleTagged()` helper to `src/lib/transcript-render.ts` if not already shared.

## Skills Required

- typescript
- unit-testing (vitest)

## Acceptance Criteria

- [ ] `src/harnesses/codex/transcript.ts` exports `parseCodexTranscript(text: string): RoleTaggedTranscript`
- [ ] `session_meta` lines are ignored
- [ ] `response_item` with `payload.type == "message"`: extract `payload.role` (`user`/`assistant` → `user`/`agent`) and concatenate text from `payload.content[].text`
- [ ] `event_msg` with `payload.type == "user_message"`: emit one `user` turn from `payload.message`
- [ ] `event_msg` with `payload.type == "task_complete"`: emit one `agent` turn from `payload.last_agent_message`
- [ ] Robust to malformed lines (empty lines skipped, JSON parse errors logged-and-skipped, not thrown)
- [ ] Codex adapter's `parseTranscript` and `renderTranscript` wired to this module
- [ ] `renderRoleTagged()` (currently in `src/harnesses/claude/transcript.ts` or `src/lib/transcript.ts`) lives in `src/lib/transcript-render.ts` (shared) — Claude adapter and Codex adapter both import it
- [ ] Vitest test covers: a hand-crafted JSONL containing one of each line type, asserting the resulting `interleaved` array has the expected user/agent split in order

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TypeScript JSON-line parsing
- Vitest for the unit test

## Input Dependencies

- Task 7 (Codex adapter scaffold)

## Output Artifacts

- `src/harnesses/codex/transcript.ts`
- `src/lib/transcript-render.ts` (shared renderer, if not already shared)
- Vitest unit test under `tests/harnesses/codex/transcript.test.ts`

## Implementation Notes

<details>
<summary>Guidance</summary>

- Sample JSONL line shapes (from Codex official docs; cross-reference `developers.openai.com/codex/cli` and `github.com/openai/codex`):
  ```jsonl
  {"type":"session_meta","payload":{"id":"<uuid>","started_at":"..."}}
  {"type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"hello"}]}}
  {"type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"hi"}]}}
  {"type":"event_msg","payload":{"type":"user_message","message":"hello"}}
  {"type":"event_msg","payload":{"type":"task_complete","last_agent_message":"done"}}
  ```
- `payload.role === 'assistant'` maps to `agent` in our shared vocabulary.
- For `response_item.payload.content`, concatenate `text` from items whose own `type` ends in `_text` (input_text, output_text). Skip non-text content (images, tool calls) for v1.
- Watch for duplication: if both a `response_item/message/assistant` line and a `task_complete` event line appear in the same rollout for the same turn, prefer `response_item` and skip `task_complete` (it's a summary echo). A simple dedupe heuristic: skip `task_complete` whenever the immediately previous emitted turn is `agent` with matching text. Document this in code comments only if non-obvious.
- The shared renderer (`renderRoleTagged`) just formats `[USER]:\n...\n\n[AGENT]:\n...`. It already exists; relocate without behavior change.

</details>
