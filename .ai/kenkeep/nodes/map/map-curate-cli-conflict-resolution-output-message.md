---
schema_version: 1
id: map-curate-cli-conflict-resolution-output-message
title: curate CLI conflict-resolution output message
kind: map
tags:
  - cli
  - curate
  - conflicts
  - output
derived_from: []
relates_to:
  - map-curate-command
  - map-conflict-files
confidence: high
summary: >-
  src/commands/curate.ts emits a multi-line message when conflicts > 0, naming
  the three resolution outcomes and pointing users at /kk-curate.
---
`src/commands/curate.ts` (around lines 102-110) emits a multi-line message whenever the curate run produces conflict files. The message starts with a `log.warn` headline ("N conflict(s) need resolution in .ai/kenkeep/conflicts/.") and follows with per-outcome lines for accept, reject, and keep-as-record, plus a note that unresolved conflicts re-surface on the next curate run.

The message is only emitted when `result.conflicts > 0`, so the happy path (no conflicts) is unchanged. Tests assert on `result.conflicts` counts, not on the string itself.
