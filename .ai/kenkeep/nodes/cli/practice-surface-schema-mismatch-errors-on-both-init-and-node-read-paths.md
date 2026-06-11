---
schema_version: 2
id: practice-surface-schema-mismatch-errors-on-both-init-and-node-read-paths
title: Surface schema mismatch errors on both init and node-read paths
kind: practice
tags:
  - kenkeep
  - migration
  - schema
  - error
  - cli
derived_from: []
relates_to:
  - practice-strict-schema-version-bump-policy
  - map-node-frontmatter
depends_on: []
confidence: high
summary: >-
  Migration schema mismatch errors must be visible both when init runs and when
  node-reading commands execute.
---
When a knowledge base uses an older schema version (e.g., the legacy v1 flat `nodes/<kind>/` layout), the mismatch must be surfaced to the user on both paths: (1) when `init` or `init --upgrade` runs against the repo, and (2) when any node-reading command (`doctor`, `index-rebuild`, `lint`, `curate`, `node write`, etc.) executes. The `init` path is a loud `log.error` but non-fatal (exit 0), because `init`/`upgrade` did their job of refreshing templates; the migration itself is a deliberate, harness-backed follow-up. The node-read path throws `OldLayoutError` with a message pointing to the correct migration command. The error must never point to `init --upgrade` (which does not migrate nodes) or to deleting the `nodes/` tree (data loss).
