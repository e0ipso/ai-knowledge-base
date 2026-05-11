---
title: Bootstrap
nav_order: 4
has_children: false
permalink: /bootstrap/
---

# Bootstrap

_Coming in M3.5._

Two ways to seed the KB from existing documentation:

- **First-time bootstrap (`/kb:bootstrap`)** — supervised agent-driven pass. Best for messy real-world docs trees.
- **Incremental bootstrap (`ai-knowledge-base bootstrap-incremental`)** — deterministic CLI, hash-aware. Run after adding or changing source docs.

See [IMPLEMENTATION §6.10](https://github.com/e0ipso/ai-knowledge-base/blob/main/IMPLEMENTATION.md#610-bootstrap-pipelines) for the design and [PRD §7.6–§7.7](https://github.com/e0ipso/ai-knowledge-base/blob/main/PRD.md#86-first-time-bootstrap-from-existing-docs-optional-one-off) for usage scenarios.
