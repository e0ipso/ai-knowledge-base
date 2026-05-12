---
schema_version: 1
id: map-transcript-artifact
title: 'Transcript: raw session capture in the KB pipeline'
kind: map
tags:
  - kb-pipeline
  - artifact
  - vocabulary
valid_from: '2026-05-12T15:47:26.762Z'
valid_until: null
updated: '2026-05-12T15:50:15.078Z'
supersedes: null
superseded_by: null
derived_from:
  - 20260512-1527-aa21a0a11614.md
relates_to:
  - map-proposal-artifact
  - map-sessions-directory
depends_on: []
confidence: high
summary: >-
  The 'Transcript' is the raw role-tagged session log fed into the KB extraction
  pipeline.
---
In the project's knowledge-base pipeline, the 'Transcript' artifact is the role-tagged session log (lines prefixed `[USER]:` / `[AGENT]:`) captured from an AI coding session. It is the input to the Proposal extraction step. Stored under `_sessions/` and referenced by `## Transcript` section headers in session logs.
