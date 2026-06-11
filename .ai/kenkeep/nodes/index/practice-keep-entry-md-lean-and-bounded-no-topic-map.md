---
schema_version: 2
id: practice-keep-entry-md-lean-and-bounded-no-topic-map
title: Keep ENTRY.md lean and bounded — no topic map
kind: practice
tags:
  - kenkeep
  - entry
  - index
  - design
derived_from: []
relates_to:
  - map-entry-md
depends_on: []
confidence: high
summary: >-
  The top-level entry catalog (ENTRY.md) stays intentionally lean and bounded,
  containing no global topic map.
---
The top-level entry catalog (`.ai/kenkeep/ENTRY.md`) is purpose-built as a concise, bounded whole-tree launchpad. It does not include a global topic-map section, which would grow with tag cardinality and inject excessive tokens into every session. Instead, it lists only the top-level branch structure with compact node counts. This keeps the entry point token-efficient while maintaining recall effectiveness. The frontmatter preserves the global `nodes_hash` for staleness detection. A legacy `INDEX.md` is removed on rebuild and read with fallback for un-rebuilt repos.
