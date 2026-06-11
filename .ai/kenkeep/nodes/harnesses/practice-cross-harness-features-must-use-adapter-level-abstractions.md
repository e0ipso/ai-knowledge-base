---
schema_version: 2
id: practice-cross-harness-features-must-use-adapter-level-abstractions
title: Cross-harness features must use adapter-level abstractions
kind: practice
tags:
  - harnesses
  - cross-harness
  - abstractions
  - architecture
derived_from: []
relates_to:
  - practice-adapters-never-cross-directories
  - practice-no-event-translation-across-adapters
  - map-harness-adapter
depends_on: []
confidence: high
summary: >-
  When designing features that span all harnesses, build adapter-level
  abstractions that work for every harness rather than assuming Claude's shape
  is universal.
---
When designing features that affect all harnesses, do not assume Claude Code's path is the universal path. Every harness has a distinct raw transcript format, event vocabulary, and storage model. The correct design is a first-class adapter-level abstraction that each harness implements independently, with graceful degradation (`[]` for unsupported capabilities) rather than centralizing logic around Claude's specific shape.

This applies to capture hooks, transcript parsing, tool-call extraction, and any cross-harness feature. The shared `HookEvent` is deliberately opaque; shared code iterates `adapter.hooks` and never branches on Claude's event names. Each adapter declares its own native events and capabilities.
