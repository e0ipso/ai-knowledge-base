---
schema_version: 1
id: map-kb-claude-skills
title: "Claude Code skills: /kb-curate, /kb-add, /kb-bootstrap"
kind: map
tags: [skills, claude-code, curate, add, bootstrap]
derived_from:
  - docs/cli-reference.md
  - docs/daily-use.md
  - PRD.md
relates_to: [map-ai-knowledge-base-cli]
depends_on: []
confidence: high
summary: "init --assistants claude installs three skills. /kb-curate and /kb-add map to CLI subcommands; /kb-bootstrap is agent-driven only and has no CLI equivalent."
---

# Claude Code skills: `/kb-curate`, `/kb-add`, `/kb-bootstrap`

`init --assistants claude` installs three skills under `.claude/skills/`:

| Command | Equivalent | Notes |
|---|---|---|
| `/kb-curate` | `ai-knowledge-base curate` | Runs the curator. Contradictions land as one markdown file per conflict under `.ai/knowledge-base/conflicts/`, reviewed by the user via `git diff`. |
| `/kb-add` | `ai-knowledge-base node add` | Interactive prompt to write a new node. Fails loud if the id already exists. |
| `/kb-bootstrap [path]` | (none) | Agent-driven only. Surveys existing docs, writes new nodes, never overwrites; supervised by the user in-session. |

The skill bodies live under `src/templates-source/claude/skills/<name>/SKILL.md` and are copied into the consumer's `.claude/skills/` by `init`. To customize the bootstrap behavior, edit `.claude/skills/kb-bootstrap/SKILL.md` directly; to customize the curate prompt, edit `.ai/knowledge-base/.config/prompts/curator.md`.
