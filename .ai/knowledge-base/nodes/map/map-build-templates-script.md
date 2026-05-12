---
schema_version: 2
id: map-build-templates-script
title: 'scripts/build-templates.mjs: regenerates templates/ from sources'
kind: map
tags:
  - build
  - templates
  - script
valid_from: '2026-05-12T14:51:07.760Z'
valid_until: null
updated: '2026-05-12T15:50:15.077Z'
supersedes: null
superseded_by: null
derived_from:
  - 20260512-1439-722a03fa9cbe.md
relates_to:
  - map-templates-npm-artifact
  - practice-do-not-commit-bundled-output
depends_on: []
confidence: high
summary: >-
  Build script that wipes templates/ and rebuilds it from src/templates-source/
  and dist/hooks/.
---
`scripts/build-templates.mjs` is the build step responsible for the `templates/` directory. It calls `rmSync(dest, ...)` at the start and regenerates the entire directory from two sources: static content under `src/templates-source/` and bundled hook output from `dist/hooks/`. `templates/` is therefore entirely build output, not authored content.
