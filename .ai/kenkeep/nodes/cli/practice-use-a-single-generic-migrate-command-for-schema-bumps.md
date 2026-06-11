---
schema_version: 2
id: practice-use-a-single-generic-migrate-command-for-schema-bumps
title: Use a single generic migrate command for schema bumps
kind: practice
tags:
  - migration
  - cli
  - schema
derived_from: []
relates_to:
  - practice-strict-schema-version-bump-policy
  - map-node-frontmatter
depends_on: []
confidence: high
summary: >-
  Schema migrations are handled by one generic migrate command that detects the
  current schema and dispatches the appropriate step, not by separate commands
  per bump.
---
The project uses a single `migrate` command for all schema bumps. The command reads the on-disk schema version, compares it to the code's target version, and runs the matching step(s) from a registry. This allows future schema bumps to append one entry to the registry rather than adding a new command.
