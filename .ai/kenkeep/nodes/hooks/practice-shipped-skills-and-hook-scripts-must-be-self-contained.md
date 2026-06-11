---
schema_version: 2
id: practice-shipped-skills-and-hook-scripts-must-be-self-contained
title: Shipped skills and hook scripts must be self-contained
kind: practice
tags:
  - skills
  - hooks
  - cli
  - packaging
derived_from: []
relates_to:
  - map-hook-build-pipeline-ts-to-cjs
depends_on: []
confidence: medium
summary: >-
  Skills, CLI launchers, and hook scripts may use only Node built-ins and
  relative-path references — no external file dependencies.
---
Shipped skills (`SKILL.md` workflows), CLI hook scripts, and harness hook bundles are self-contained: they rely on Node built-ins and paths relative to the script or skill directory, and do not depend on files outside the package or consumer install tree.

This keeps `init --upgrade` deployments portable and prevents hook failures when optional repo-local files are absent. Shared logic belongs in compiled bundles under `dist/` or inlined via the tsup `noExternal` hook build, not in ad-hoc imports from arbitrary paths.
