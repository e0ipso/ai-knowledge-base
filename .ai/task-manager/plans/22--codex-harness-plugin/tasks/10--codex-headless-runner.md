---
id: 10
group: "codex-adapter"
dependencies: [3, 4, 7]
status: "completed"
created: 2026-05-15
skills:
  - typescript
  - zod
---

# Codex headless runner via `codex exec --json`

## Objective

Implement `src/harnesses/codex/headless.ts` exposing `runHeadlessCodex<T>(promptBody, stdin, schema, opts)`. Spawn `codex exec --json` with the prompt and parse its event stream. The final answer is the last `item.completed` event with `item.type == "agent_message"`; parse its `text` as JSON, validate against the caller's Zod schema, return the value. Stream all events into `logFile` if provided. Honor `harnessOpts.model` → `--model`, `harnessOpts.reasoningEffort` → `-c reasoning.effort=...`, `--sandbox read-only --ephemeral` by default. Always set `KB_BUILDER_INTERNAL=1` on the child.

## Skills Required

- typescript
- zod (validate the structured result)

## Acceptance Criteria

- [ ] `src/harnesses/codex/headless.ts` exports `runHeadlessCodex<T>` matching the `HarnessAdapter.runHeadless` signature
- [ ] Spawns `codex exec --json` (or `codex exec --json -` if stdin is needed for the prompt) via `execa` with stream piping
- [ ] Parses stdout as line-delimited JSON events; tracks the last `item.completed` with `item.type === 'agent_message'`
- [ ] Extracts the final `text` field, parses as JSON, validates against `schema`, returns the typed value
- [ ] Sets env: `{ ...process.env, ...opts.env, KB_BUILDER_INTERNAL: '1' }`
- [ ] Honors `opts.harnessOpts.model` → `--model <value>` flag
- [ ] Honors `opts.harnessOpts.reasoningEffort` → `-c reasoning.effort=<value>` flag
- [ ] Default args include `--sandbox read-only --ephemeral` (curate and bootstrap are read-only by design)
- [ ] Writes one JSON line per event to `opts.logFile` if provided (atomic append; mirror Claude's log format)
- [ ] Respects `opts.timeoutMs` (kill child + reject the promise)
- [ ] Calls `opts.onMessage` for each parsed event so callers can stream
- [ ] Throws a clear error with stderr tail if the child exits non-zero or the final `agent_message` is missing
- [ ] Codex adapter's `runHeadless` is wired to this function (with `harnessOpts` validation per Task 3)
- [ ] Vitest unit test feeds a fake stdout (a fixture string of newline-delimited JSON events) into a stub child process and asserts the parsed-and-validated return value

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `execa` (already a dependency)
- `split2` (already a dependency) for line-buffered stdout parsing
- Zod for result validation

## Input Dependencies

- Task 3 (HeadlessRunOptions / harnessOpts shape)
- Task 4 (per-harness model schema; the Codex variant defines model/reasoningEffort)
- Task 7 (Codex adapter scaffold to wire into)

## Output Artifacts

- `src/harnesses/codex/headless.ts`
- Vitest unit test with stubbed-stream fixture

## Implementation Notes

<details>
<summary>Guidance</summary>

- Codex event types of interest (from official docs `developers.openai.com/codex/cli`):
  - `thread.started`
  - `turn.started`
  - `item.started`
  - `item.completed` — final outputs land here; `item.type` distinguishes `agent_message`, `tool_use`, etc.
  - `turn.completed`
  - `error`
- Final-answer extraction: keep a `lastAgentMessage: string | undefined` while streaming. On `item.completed` with `item.type === 'agent_message'`, set `lastAgentMessage = item.text`. After child exit, parse it as JSON, then `schema.parse(...)`.
- For passing the prompt: `codex exec --json <prompt>` accepts the prompt as a positional argv; very long prompts go through stdin (`codex exec --json -` and write to `child.stdin`). Use stdin whenever `stdin` arg is non-empty or `promptBody` exceeds ~64 KB.
- Per `feedback_no_backwards_compat`: no fallback to non-JSON parsing of the agent message. If parsing fails, throw.
- Use the Claude adapter's `headless.ts` as the structural template; the wrapper logic (timeout, logging, env, onMessage) is parallel.

</details>
