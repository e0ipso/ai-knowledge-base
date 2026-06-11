---
schema_version: 2
id: practice-add-hermetic-end-to-end-capture-tests-per-harness
title: Add hermetic end-to-end capture tests per harness
kind: practice
tags:
  - testing
  - hooks
  - capture
  - harnesses
derived_from: []
relates_to:
  - practice-testing-philosophy-few-tests-mostly-integration
  - map-capture-hook
depends_on: []
confidence: high
summary: >-
  Unit tests alone miss capture regressions; each harness needs a hermetic
  integration test that exercises the built hook end-to-end.
---
Capture hooks for OpenCode, Cursor, and Copilot can pass the full unit suite while failing real sessions — pipe truncation, wrong export session ids, and read-tool name drift are examples that only surface when the built hook runs against realistic transcript or export fixtures.

Each harness adapter carries at least one hermetic end-to-end capture test that invokes the compiled hook against a checked-in fixture (transcript JSONL, `opencode export` JSON, or Copilot `events.jsonl`) and asserts both a non-empty `_sessions/*.md` and, when the fixture includes a `nodes/` read, a matching `usage.jsonl` leaf.

These tests complement the existing parametrized read-extract and transcript-parser unit tests; they do not replace them.
