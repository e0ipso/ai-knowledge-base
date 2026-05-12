---
schema_version: 1
id: map-kb-stage2-drain
title: 'kb-stage2-drain: async worker that runs the extraction step'
kind: map
tags:
  - worker
  - stage-2
  - kb-pipeline
valid_from: '2026-05-12T14:51:02.976Z'
valid_until: null
updated: '2026-05-12T15:50:15.076Z'
supersedes: null
superseded_by: null
derived_from:
  - 20260512-1438-e5b4618a5295.md
  - 20260512-1527-aa21a0a11614.md
relates_to:
  - map-claude-hooks
  - practice-rename-stage-vocab-to-transcript-proposal
depends_on: []
confidence: high
summary: >-
  SessionStart async hook that spawns a Claude SDK subprocess to extract
  structured proposals from each queued session log.
---
`kb-stage2-drain` (built from `src/lib/stage2-drain.ts`) processes pending entries in `.queue.json`. For each, it spawns a Claude Code SDK subprocess running the extraction prompt against the session log's transcript slice, parses the JSON result with `Stage2OutputSchema` (`stage2-drain.ts:175`), and writes `proposals.practice` and `proposals.map` arrays into the session log's frontmatter. It then replaces the body placeholder with a completion marker (`stage2-drain.ts:294`).

Each subprocess invocation produces one `_logs/stage-2/<session-id>__<timestamp>Z.jsonl` stream-json audit log.

This hook and its associated identifiers (config keys, frontmatter fields, log subdir) are slated to be renamed to a Proposal-based vocabulary (see `practice-rename-stage-vocab-to-transcript-proposal`).
