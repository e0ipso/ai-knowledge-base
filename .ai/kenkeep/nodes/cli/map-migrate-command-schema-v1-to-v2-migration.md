---
schema_version: 2
id: map-migrate-command-schema-v1-to-v2-migration
title: migrate command — schema v1 to v2 migration
kind: map
tags:
  - kenkeep
  - migration
  - cli
derived_from: []
relates_to:
  - map-curate-command
  - map-node-frontmatter
depends_on: []
confidence: high
summary: >-
  The `migrate` command is the correct tool for migrating a knowledge base from
  schema v1 to v2.
---
The `npx kenkeep --harness <id> migrate` command is the correct tool for migrating a knowledge base from the legacy flat `nodes/<kind>/` layout (schema v1) to the topical-folder tree layout (schema v2). It clusters flat leaves in-session and preserves every node's id and edges. The `migrate` command is hidden in the CLI (`hidden: true`). `init` and `init --upgrade` do not migrate nodes — they only refresh templates, prompts, and the version marker. The `--harness` flag is a global CLI option and must precede the subcommand (`npx kenkeep --harness <id> migrate`).
