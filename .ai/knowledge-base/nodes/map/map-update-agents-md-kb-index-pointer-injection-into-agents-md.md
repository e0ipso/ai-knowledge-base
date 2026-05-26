---
schema_version: 1
id: map-update-agents-md-kb-index-pointer-injection-into-agents-md
title: updateAgentsMd - KB index pointer injection into AGENTS.md
kind: map
tags:
  - init
  - upgrade
  - agents-md
  - markers
  - index
derived_from: []
relates_to:
  - map-index-md
  - practice-init-does-not-install-commit-tooling
confidence: high
summary: >-
  Function in src/commands/init.ts that injects or replaces a sentinel-guarded
  static pointer to INDEX.md in AGENTS.md.
---
`updateAgentsMd(root: string)` in `src/commands/init.ts` injects a static pointer block into `AGENTS.md` at the project root. It is called from both `runInit()` and `runUpgrade()`.

The block is bounded by `<!-- >>> @e0ipso/ai-knowledge-base:kb-index >>> -->` and `<!-- <<< @e0ipso/ai-knowledge-base:kb-index <<< -->`. If the start sentinel is found, the content between markers is replaced; otherwise the block is appended at the end of the file. If `AGENTS.md` does not exist, it is created.

The injected pointer content: `Curated project knowledge lives in [.ai/knowledge-base/INDEX.md](.ai/knowledge-base/INDEX.md). Consult it before designing a non-trivial change.`
