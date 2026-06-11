---
schema_version: 2
id: map-session-log
title: Session log (_sessions/*.md)
kind: map
tags:
  - session
  - capture
  - state
  - schema
derived_from:
  - docs/internals/hooks.md
  - docs/internals/schemas.md
  - docs/internals/architecture.md
relates_to:
  - map-capture-hook
  - map-proposal-drain-hook
depends_on: []
confidence: high
summary: >-
  Per-session checkpoint at _sessions/<YYYYMMDD-HHmm-id>.md; one file per
  session_id; frontmatter tracks capture, proposal, and curator phases.
---

# Session log (`_sessions/*.md`)

Filename: `YYYYMMDD-HHmm-<sessionId>.md`. Re-firing the capture hook for the same `session_id` overwrites in place via `findSessionLogBySessionId`, so the session-log count stays at one per session even across multi-turn sessions, PreCompact-after-Stop, etc.

Frontmatter (validated by `SessionLogFrontmatterSchema`):

```yaml
schema_version: 1
session_id: <claude-code-session-id>
captured_by: stop | session_end | pre_compact | manual
captured_at: <ISO>
transcript_hash: sha256:<hex>
proposal_status: pending | done | failed | skipped
proposal_completed_at: <ISO> | null
proposal_error: <string> | null
proposal_log: _logs/proposal/<id>__<ts>.jsonl | null
topics: [string, ...]
proposals:
  practice: [<ProposalCandidate>, ...]
  map: [<ProposalCandidate>, ...]
curator_processed_at: <ISO>
curator_run_id: <UUID>
```

`captured_by` records which lifecycle trigger produced the log, as one of the canonical `CaptureTrigger` values (`stop` | `session_end` | `pre_compact` | `manual`). It is derived per-adapter, not from a shared Claude-keyed event map: each harness's `kk-capture` maps its own native event name to the canonical trigger and passes it on `HookInput.trigger`, which `captureSession` writes here (defaulting to `stop`). Examples: Copilot `sessionEnd`→`session_end` and `agentStop`→`stop`; Cursor `preCompact`→`pre_compact`; Codex `Stop`→`stop`; OpenCode `session.idle`→`stop`; Claude's values are unchanged (`Stop`→`stop`, `SessionEnd`→`session_end`, `PreCompact`→`pre_compact`).

Lifecycle:

1. `kk-capture.mjs` writes the file with `proposal_status: pending` and the transcript slice.
2. `kk-proposal-drain.mjs` (next `SessionStart`, async) processes pending entries, populates `proposals.{practice,map}` and `topics`, and sets `proposal_status: done` (or `failed` with `proposal_error`).
3. `curate` reads `done` logs, applies actions to `nodes/`, sets `curator_processed_at` and `curator_run_id`.
