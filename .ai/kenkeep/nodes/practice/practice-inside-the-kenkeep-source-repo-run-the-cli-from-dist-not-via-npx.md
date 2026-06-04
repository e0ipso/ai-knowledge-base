---
schema_version: 1
id: >-
  practice-inside-the-kenkeep-source-repo-run-the-cli-from-dist-not-via-npx
title: 'Inside the kenkeep source repo, run the CLI from dist/, not via npx'
kind: practice
tags:
  - kenkeep
  - kk-curate
  - repo-local
  - npx
  - cli
derived_from: []
relates_to:
  - map-curate-command
  - map-kenkeep-package
confidence: high
summary: >-
  In the kenkeep source repo, invoke node ./dist/cli.js (after
  npm run build) instead of npx kenkeep@latest.
---
The `/kk-curate` skill template ships an `npx --yes kenkeep@latest curate ...` invocation because it is package-agnostic and runs in consumer repos. Inside the `kenkeep` source repo, the correct invocation is `node ./dist/cli.js curate --harness <id>` (after `npm run build` if freshness matters).

`dist/cli.js` is the exact same binary npx would download, minus a registry round-trip and minus the risk of version skew between the source you are editing and the published binary that ran. Following the skill's npx line verbatim inside the source repo wastes a network round-trip and can run a different version than the working tree.

Applies to: any session inside the `kenkeep` source repo that invokes the CLI directly (curate, index rebuild, etc.).
