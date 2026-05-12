---
schema_version: 1
id: practice-rename-stage-vocab-to-transcript-proposal
title: Rename Stage 1/Stage 2 to Transcript/Proposal across the KB pipeline
kind: practice
tags:
  - naming
  - refactor
  - kb-pipeline
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
  - map-proposal-artifact
  - map-kb-stage2-drain
depends_on: []
confidence: high
summary: >-
  Rename Stage 1 to Transcript and Stage 2 to Proposal everywhere (code, config,
  frontmatter, prompts, docs).
---
In the knowledge-base pipeline, the labels 'Stage 1' and 'Stage 2' are poor names. Use 'Transcript' (raw session capture) and 'Proposal' (structured candidate nodes produced by extraction) consistently across:

- File names (e.g., `kb-stage2-drain.mjs` becomes a proposal-drain equivalent)
- Config keys (`stage2Timeout`, `stage2Model` become proposal-prefixed)
- Frontmatter fields (`stage_2_status`, `stage_2_completed_at`, `stage_2_error`, `stage_2_log`)
- TypeScript types/schemas (`Stage2Status`, `Stage2Output`, `Stage2Candidate`, `Stage2OutputSchema`)
- Lock names, log subdirectories (`_logs/stage-2/` becomes `_logs/proposal/`)
- Markdown section headers in session logs (`## Stage 1` becomes `## Transcript`)
- Docs: PRD, IMPLEMENTATION, README, internals docs

**Why:** 'Stage 1/2' is opaque; 'Transcript' and 'Proposal' communicate what each artifact actually is.

**How to apply:** When touching pipeline code, config, prompts, or docs, use the Transcript/Proposal vocabulary; if you find remaining Stage 1/2 references, rename them as part of the change rather than letting both vocabularies coexist.
