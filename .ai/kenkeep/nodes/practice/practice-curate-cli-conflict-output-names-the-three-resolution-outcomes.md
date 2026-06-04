---
schema_version: 1
id: practice-curate-cli-conflict-output-names-the-three-resolution-outcomes
title: Curate CLI conflict output names the three resolution outcomes
kind: practice
tags:
  - kenkeep
  - kk-curate
  - conflicts
  - cli
  - ux
derived_from: []
relates_to:
  - map-curate-command
  - map-conflict-files
  - practice-curator-never-auto-resolves-contradictions
confidence: high
summary: >-
  When the curate CLI writes conflict files, its stdout message names the
  accept/reject/keep-as-record outcomes and points users at /kk-curate.
---
When `curate` produces conflict files under `.ai/kenkeep/conflicts/`, the CLI's stdout message names all three resolution outcomes (accept: edit target node + `git restore` conflict; reject: `git restore` conflict; keep as record: `git commit` conflict) and points users at the `/kk-curate` skill for interactive resolution. It also notes that unresolved conflict files re-surface on the next curate run.

The CLI cannot detect whether it was invoked by the `/kk-curate` skill or directly, so the conflict-output message must be useful in both cases. A bare "N conflict(s) written, review with git diff" line is a dead end for users who run the CLI directly without the skill -- they get conflict files on disk but no idea that the existing nodes were deliberately not overwritten and that a decision is required.

Applies to: any future changes to the curate command's terminal output around conflicts.
