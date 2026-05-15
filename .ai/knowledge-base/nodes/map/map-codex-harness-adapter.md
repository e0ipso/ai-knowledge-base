---
schema_version: 1
id: map-codex-harness-adapter
title: "Codex harness adapter"
kind: map
tags: [harness, adapter, codex, integration]
derived_from: []
relates_to: [map-adapter-interface, practice-explicit-harness-flag, map-claude-hooks]
confidence: high
summary: "Codex harness id `codex`; source under src/harnesses/codex/, templates under templates/codex/, installs into .codex/ and .agents/skills/."
---

# Codex harness adapter

The Codex harness implements the adapter contract defined by [[map-adapter-interface]] for the Codex CLI runtime. Its identifier is `codex`.

## File layout

- `src/harnesses/codex/` holds the adapter implementation: `install.ts`, `headless.ts`, `transcript.ts`, `hooks-config.ts`, `hook-spec.ts`, `doctor.ts`, `opts.ts`, and `index.ts` (the registry-facing surface).
- `src/templates-source/codex/` holds the template tree shipped to consumer repos: `hooks/` for compiled hook scripts and `skills/kb-{add,bootstrap,curate}/SKILL.md` for the Codex-flavored skill prose.
- `templates/codex/` is the built copy of that tree, produced by `scripts/build-templates.mjs` and shipped via the package `files:` glob.

## Install paths

On `init --harnesses codex`, `installCodex` writes into the consumer repo:

- `.codex/hooks/*.mjs` for the compiled hook scripts.
- `.codex/hooks.json` registering the hook set with the Codex runtime.
- `.agents/skills/kb-{add,bootstrap,curate}/SKILL.md` (shared skills location used by every harness that supports it).

## Hooks supported

The Codex runtime exposes a narrower hook surface than Claude Code. The Codex adapter registers two events:

- `Stop`: drives `kb-capture` (transcript redaction and session log write).
- `SessionStart`: drives the index nudge and the proposal drain pass.

Events that the Claude harness uses (`SessionEnd`, `PreCompact`) have no Codex equivalent; the captured session is finalized at `Stop` instead. Cross-reference [[map-claude-hooks]] for the Claude-side mapping.

## Transcript format

Codex stores conversation state as a JSONL rollout file. Each line is one record with a `type` discriminator (`session_meta`, `response_item`, `event_msg`). `readTranscript` parses the rollout, filters to user and assistant turns, and produces the canonical `RoleTaggedTranscript` the rest of the pipeline expects.

## Harness flag

Every CLI invocation emitted from a Codex skill or hook script carries `--harness codex` because Codex offers no reliable runtime env signal; see [[practice-explicit-harness-flag]].
