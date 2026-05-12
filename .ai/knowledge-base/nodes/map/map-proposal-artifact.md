---
schema_version: 1
id: map-proposal-artifact
title: 'Proposal: structured candidate nodes extracted from a Transcript'
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
  - map-transcript-artifact
  - map-kb-proposal-drain
depends_on: []
confidence: high
summary: >-
  The 'Proposal' is the structured set of practice/map candidate nodes produced
  by extraction from a Transcript.
---
In the project's knowledge-base pipeline, the 'Proposal' artifact is the JSON output of the extraction step that turns a Transcript into structured `practice` and `map` candidate nodes. It is later curated into final KB nodes. Associated identifiers include the proposal drain script, config keys (timeout/model), frontmatter fields (status, completed_at, error, log), TS types/schemas, lock name, and log subdir `_logs/proposal/`.
