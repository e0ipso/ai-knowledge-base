---
schema_version: 1
id: practice-document-model-recommendations-with-harness-agnostic-framing-2
title: Document model recommendations with harness-agnostic framing
kind: practice
tags:
  - documentation
  - harness
  - models
  - recommendations
derived_from: []
relates_to: []
confidence: high
summary: >-
  When recommending model/effort configurations, avoid naming specific models;
  use harness-agnostic framing with per-harness examples.
---
When the documentation or nudge text advises users on model selection, use harness-agnostic framing rather than naming a specific vendor model. The rationale: Cursor and OpenCode let users choose any model family, so naming one provider's model leaves those harnesses underspecified.

Instead, state the cognitive requirement in one sentence (e.g. "mid-tier model at moderate effort"), then give concrete examples for each supported harness: Claude adapter → `sonnet`/`medium`, Codex adapter → `gpt-5-codex`/`low`, Cursor/OpenCode → user selects any mid-tier model available in their provider.

This applies to docs sections, warning boxes, and nudge copy anywhere the system advises on LLM configuration.
