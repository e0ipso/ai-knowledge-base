---
schema_version: 1
id: practice-explicit-harness-flag
title: "Every CLI invocation passes `--harness <id>` explicitly"
kind: practice
tags: [cli, invocation, harness]
derived_from: []
relates_to: [practice-cli-invocations-use-npx-scoped, map-codex-harness-adapter, map-adapter-interface]
confidence: high
summary: "Every `npx @e0ipso/ai-knowledge-base ...` call from a skill, hook, or doc must pass `--harness <id>` because Codex provides no reliable runtime detection."
---

# Every CLI invocation passes `--harness <id>` explicitly

Every user-facing invocation of `npx @e0ipso/ai-knowledge-base ...` from a skill body, a hook script, or documentation must carry an explicit `--harness <id>` flag (for example `--harness claude`, `--harness codex`). The flag is the contract between the harness adapter that emitted the command and the CLI process that runs it; it tells the CLI which adapter to dispatch to without relying on environment inference.

## Rationale

The Claude Code harness sets distinctive env vars (`CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`) that runtime detection can key off. Codex offers no equivalent: a Codex session and a plain shell invocation look identical to the CLI from the inside. The only robust signal is the flag the calling skill or hook puts on the command line.

Treating `--harness <id>` as required everywhere (not "Codex-only") keeps the contract uniform: skills templated for `claude` pass `--harness claude`, skills templated for `codex` pass `--harness codex`, and the CLI never has to guess.

## How to apply

- Every code path that emits a `npx @e0ipso/ai-knowledge-base ...` command line for a user (skill body, hook script, doc example, troubleshooting snippet) appends `--harness <id>`.
- Template source under `src/templates-source/<harness>/skills/*/SKILL.md` and hook scripts under `src/templates-source/<harness>/hooks/` are responsible for embedding the correct id for their harness at build time.
- Tests assert that generated skill files contain the expected `--harness` flag.

## Out of scope

Internal-only invocations spawned by the CLI itself (subprocess fan-out inside `bootstrap-incremental` or `curate`) do not need the flag on their internal command lines, because the parent process already knows the harness and passes context through other channels. The rule targets the surface that humans and harness sessions actually type or template into prose.

See also [[practice-cli-invocations-use-npx-scoped]] for the broader rule that all invocations use the scoped `npx` form, and [[map-codex-harness-adapter]] for the adapter that motivated making the flag mandatory.
