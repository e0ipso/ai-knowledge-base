---
schema_version: 1
id: map-harness-adapter
title: "Harness adapter"
kind: map
tags: [harness, adapter, claude, codex, cursor, opencode, architecture]
derived_from:
  - README.md
  - docs/installation.md
  - docs/internals/architecture.md
  - CONTRIBUTING.md
relates_to:
  - map-claude-harness
  - map-codex-harness
  - map-cursor-harness-adapter
  - map-opencode-harness
  - practice-explicit-harness-flag-outside-claude
depends_on: []
confidence: high
summary: "Per-runtime adapter implementing HarnessAdapter; declares its event vocabulary, hook/skill paths, and hook scripts. Four ship: claude, codex, cursor, opencode."
---

# Harness adapter

A "harness" is one of the assistant CLIs the package drives. Four adapters ship: `claude` (Claude Code), `codex` (OpenAI Codex CLI), `cursor` (Cursor agent), and `opencode` (OpenCode). Each lives under `src/harnesses/<id>/` and implements the `HarnessAdapter` contract in `src/harnesses/types.ts`.

Each adapter declares the event names its host runtime actually emits — there is no global event enum. Claude uses `Stop`/`SessionEnd`/`PreCompact`/`SessionStart`; Codex reuses Claude's names but only emits `Stop` and `SessionStart`; Cursor uses native camelCase (`stop`, `sessionEnd`, `preCompact`, `sessionStart`); OpenCode uses `session.idle`/`session.created`. Adapters never reach into each other's directories; harness-neutral logic lives under `src/lib/` or `src/commands/`.

Active-harness resolution priority (in `src/harnesses/detect.ts`): explicit `--harness <id>` flag, then env detection (`CLAUDECODE=1` for Claude; `CURSOR_VERSION` for Cursor; Codex and OpenCode export no marker), then `cliDefaultHarness` in `config.yaml`, then the first registered harness. The same priority is mirrored inside skills via the materialized `/tmp/kb-detect-harness.mjs` helper (with an early `CLAUDECODE=1` return so Claude wins over Cursor when both env signals leak).

The central registry is `src/harnesses/registry.ts`. The `HarnessAdapter` interface provides `id`, `hooks`, `paths`, `install`, `upgrade`, `parseTranscript`, `renderTranscript`, `runHeadless`, `buildHarnessOpts`, `doctorChecks`, and optional `detectFromEnv`.
