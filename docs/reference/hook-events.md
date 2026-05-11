---
title: Hook events
parent: Reference
nav_order: 3
---

# Hook events

`init` registers a single hook script — `.claude/hooks/kb-capture.mjs` — against three Claude Code events. The script implements the **stage-1 capture** pipeline: dedup, secret-scan with redaction, write a session log to `.ai/knowledge-base/_sessions/`, and append to `.queue.json` for the stage-2 worker.

## Registered events

| Event | Why we capture | Behavior |
|---|---|---|
| `Stop` | Captures after every assistant turn ends. The transcript hash changes turn-by-turn, so this produces one log per substantive checkpoint within a session. | Synchronous, ≤1 s deadline. Dedup window prevents overlap with the other two events. |
| `SessionEnd` | Captures when the user explicitly closes or clears the session. The strongest signal that the session is done. | Same pipeline as `Stop`. |
| `PreCompact` | Fires immediately before Claude Code compacts context. Without this, content about to be discarded would be lost. | Same pipeline as `Stop`. The 1-second deadline still applies; if you have a very long transcript and capture would exceed it, the hook exits silently rather than blocking compaction. |

All three events route through the same script, so the only difference in the resulting session log is the `captured_by` frontmatter field (`stop`, `session_end`, or `pre_compact`).

## Recursion guard

The hook checks `KB_BUILDER_INTERNAL=1` in its environment and exits immediately if set. Stage-2 (M2) and the curator (M3) spawn `claude -p` subprocesses with this env var so that the child Claude Code instance doesn't fire its own capture hooks and trigger recursive work.

If you wrap the `claude` CLI in a script that spawns sessions for any reason, set `KB_BUILDER_INTERNAL=1` in those subprocesses.

## What stage 1 does

1. **Read hook input.** Claude Code passes a JSON payload on stdin (session id, transcript path, cwd, event name).
2. **Parse the transcript.** The transcript file at `transcript_path` is a JSONL of conversation messages. We pull only `user` and `assistant` text content and render it as a role-tagged slice (`[USER]: …` / `[AGENT]: …`).
3. **SHA-256 dedup.** The hash of the slice is checked against `_sessions/.dedup-cache.json`. If a matching hash exists and is less than 5 minutes old, capture exits silently — Stop/SessionEnd/PreCompact often fire in close succession over the same content.
4. **Gitleaks scan + redact.** The slice is written to a temp file and passed to `gitleaks detect --no-git`. Findings are replaced with `[REDACTED:<RuleID>]` placeholders. If gitleaks isn't installed, hangs, or crashes, capture **aborts without writing a session log** — the security guarantee outweighs availability.
5. **Write the session log.** `_sessions/<YYYYMMDD-HHmm-id>.md` with frontmatter (`schema_version: 1`, `stage_2_status: pending`, `gitleaks_status`, etc.) followed by the redacted slice under a `## Stage 1: redacted transcript slice` section. A `## Stage 2: structured summary` section is left empty for the M2 worker.
6. **Append to the queue.** `_sessions/.queue.json` gets an entry pointing at the new log. Written atomically (temp file + rename).

## What stage 1 does NOT do

- Run the LLM. Stage 2 (M2) reads the queue asynchronously on the next `SessionStart` and spawns `claude -p` to produce structured proposals.
- Block on long operations. The hook has a hard 1-second deadline. If anything (gitleaks, disk I/O) goes long, the hook exits silently and the content for that trigger is lost. Subsequent triggers (the next Stop, SessionEnd, PreCompact) will re-attempt.
- Capture anything on `SessionStart`. That event is reserved for the stage-2 drain hook (M2) and the consume-side INDEX injection hook (M4).

## Failure modes

| Condition | Outcome |
|---|---|
| `KB_BUILDER_INTERNAL=1` | Hook exits immediately. No capture. |
| Empty / malformed stdin | Hook exits silently. No capture. |
| `transcript_path` missing or absent | Hook exits silently. No capture. |
| Transcript has no user or assistant text | Hook exits silently. No capture. |
| Hash matches a recent entry in `_sessions/.dedup-cache.json` | Skipped as duplicate. No capture. |
| Gitleaks not on PATH or crashes | A `[ai-knowledge-base] gitleaks blocked stage-1 capture: …` line goes to stderr. **No session log is written.** Install gitleaks and the next trigger will succeed. |
| 1-second deadline exceeded | Hook exits silently. The content is lost for this trigger; the next Stop/SessionEnd/PreCompact retries. |

## Inspecting the registration

After `init`, `.claude/settings.json` contains a block per event:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "KB_BUILDER_HOOK=Stop node .claude/hooks/kb-capture.mjs"
          }
        ]
      }
    ]
  }
}
```

The same pattern repeats for `SessionEnd` and `PreCompact`. Existing user-defined hooks in the same file are preserved on re-init.
