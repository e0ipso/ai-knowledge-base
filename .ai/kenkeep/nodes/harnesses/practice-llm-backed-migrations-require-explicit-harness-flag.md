---
schema_version: 2
id: practice-llm-backed-migrations-require-explicit-harness-flag
title: LLM-backed migrations require explicit --harness flag
kind: practice
tags:
  - migration
  - cli
  - harness
  - llm
derived_from: []
relates_to:
  - practice-explicit-harness-flag-outside-claude
  - practice-strict-schema-version-bump-policy
depends_on: []
confidence: high
summary: >-
  Migrations that cluster nodes with an LLM must fail fast if the user did not
  pass --harness explicitly.
---
Any migration step that requires an LLM must fail before spawning the harness if the `--harness` flag was not passed explicitly. The gate accepts only the explicit flag, not env detection or cliDefaultHarness. This prevents silent implicit harness selection during long-running LLM migrations.
