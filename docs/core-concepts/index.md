---
title: Core Concepts
nav_order: 3
has_children: true
permalink: /core-concepts/
---

# Core Concepts

The knowledge base is a per-repo store of curated, contributor-reviewed knowledge extracted from your AI coding sessions. Three pipelines move content through it:

- **Capture** (stage 1, then stage 2) — turns raw transcripts into structured candidate nodes.
- **Curate** — turns candidates into proposals for human review; accepted proposals become canonical nodes.
- **Consume** — injects the current knowledge base summary at session start so the assistant uses it.

Pages:

- [How it works](how-it-works.md) — the three pipelines and how they hand off.
- [Knowledge model](knowledge-model.md) — `practice` vs `map` nodes, validity windows, provenance.

See [PRD §2](https://github.com/e0ipso/ai-knowledge-base/blob/main/PRD.md#2-solution-overview) and [IMPLEMENTATION §1](https://github.com/e0ipso/ai-knowledge-base/blob/main/IMPLEMENTATION.md#1-architecture-overview) for the design.
