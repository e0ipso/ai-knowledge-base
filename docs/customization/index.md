---
title: Customization
nav_order: 5
has_children: false
permalink: /customization/
---

# Customization

_Filled in across M2–M3.5._

Topics:

- Editing the stage-2 extraction prompt (`templates/prompts/stage-2-extract.md`).
- Editing the curator prompt (`templates/prompts/curator.md`).
- Editing the bootstrap-incremental prompt (`templates/prompts/bootstrap-incremental.md`).
- Settings reference (`.ai/knowledge-base/.config.json` and `~/.config/@e0ipso/ai-knowledge-base/config.json`).

Prompts are copied to `.ai/.kb-builder/prompts/` during `init` so you can override locally; hooks pick up the local copy if present and fall back to the bundled template.
