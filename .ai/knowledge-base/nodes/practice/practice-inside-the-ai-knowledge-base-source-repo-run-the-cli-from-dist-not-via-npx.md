---
schema_version: 1
id: >-
  practice-inside-the-ai-knowledge-base-source-repo-run-the-cli-from-dist-not-via-npx
title: 'Inside the ai-knowledge-base source repo, run the CLI from dist/, not via npx'
kind: practice
tags:
  - knowledge-base
  - kb-curate
  - repo-local
  - npx
  - cli
derived_from: []
relates_to:
  - map-curate-command
  - map-ai-knowledge-base-package
confidence: high
summary: >-
  In the @e0ipso/ai-knowledge-base source repo, invoke node ./dist/cli.js (after
  npm run build) instead of npx @e0ipso/ai-knowledge-base@latest.
---
The `/kb-curate` skill template ships an `npx --yes @e0ipso/ai-knowledge-base@latest curate ...` invocation because it is package-agnostic and runs in consumer repos. Inside the `@e0ipso/ai-knowledge-base` source repo, the correct invocation is `node ./dist/cli.js curate --harness <id>` (after `npm run build` if freshness matters).

`dist/cli.js` is the exact same binary npx would download, minus a registry round-trip and minus the risk of version skew between the source you are editing and the published binary that ran. Following the skill's npx line verbatim inside the source repo wastes a network round-trip and can run a different version than the working tree.

Applies to: any session inside the `@e0ipso/ai-knowledge-base` source repo that invokes the CLI directly (curate, index rebuild, etc.).
