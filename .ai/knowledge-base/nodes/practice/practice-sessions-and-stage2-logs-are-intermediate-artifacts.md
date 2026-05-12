---
schema_version: 1
id: practice-sessions-and-stage2-logs-are-intermediate-artifacts
title: 'Session logs and extraction logs are intermediate artifacts, safe to wipe'
kind: practice
tags:
  - cleanup
  - kb-pipeline
  - intermediate-artifacts
valid_from: '2026-05-12T14:51:02.976Z'
valid_until: null
updated: '2026-05-12T15:50:15.075Z'
supersedes: null
superseded_by: null
derived_from:
  - 20260512-1438-e5b4618a5295.md
relates_to:
  - map-sessions-directory
  - map-nodes-directory
depends_on: []
confidence: high
summary: >-
  `_sessions/` and `_logs/stage-2/` are gitignored intermediate artifacts;
  curated nodes under `nodes/` are the durable output.
---
Files under `.ai/knowledge-base/_sessions/` and `.ai/knowledge-base/_logs/stage-2/` are gitignored intermediate artifacts of the capture and extraction pipeline. The committed knowledge lives under `.ai/knowledge-base/nodes/`.

It is safe to delete every file under `_sessions/` and `_logs/stage-2/` (plus `.queue.json` and `.dedup-cache.json`) to recover from a broken pipeline state; the directories are recreated automatically by `writeSessionLog` and the drain worker on the next run.
