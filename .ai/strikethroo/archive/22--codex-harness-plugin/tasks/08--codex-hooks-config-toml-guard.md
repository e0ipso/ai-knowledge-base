---
id: 8
group: "codex-adapter"
dependencies: [7]
status: "completed"
created: 2026-05-15
skills:
  - typescript
  - zod
---

# Codex hooks-config writer with TOML coexistence guard

## Objective

Implement `src/harnesses/codex/hooks-config.ts`: a writer/merger for `.codex/hooks.json` that idempotently registers our entries (marked with a path prefix so we can find them on upgrade), plus a guard that aborts the install with a clear error and docs link if the user already has inline `[hooks]` in `.codex/config.toml`.

## Skills Required

- typescript
- zod (validate the parsed `hooks.json` shape)

## Acceptance Criteria

- [ ] New file `src/harnesses/codex/hooks-config.ts` exports `writeCodexHooks(paths, specs)` and `readCodexHooks(paths)`
- [ ] Writer produces JSON matching the Codex documented shape:
  ```json
  {
    "hooks": {
      "Stop": [
        { "hooks": [{ "type": "command", "command": "node ./.codex/hooks/kb-capture.mjs", "timeout": 30 }] }
      ],
      "SessionStart": [
        { "hooks": [{ "type": "command", "command": "node ./.codex/hooks/kb-session-start.mjs", "timeout": 30 }] },
        { "hooks": [{ "type": "command", "command": "node ./.codex/hooks/kb-proposal-drain.mjs", "timeout": 30 }] }
      ]
    }
  }
  ```
- [ ] Writer preserves any user-added entries on upgrade; replaces only entries whose command starts with `node ./.codex/hooks/kb-` (our prefix marker)
- [ ] Adds a dev dependency for TOML parsing (`smol-toml` or `@iarna/toml`) in `package.json`
- [ ] Before writing, the function parses `.codex/config.toml` if it exists; if the parsed object has a non-empty `.hooks` table, throws an error with a stable docs URL (the URL must match the new docs page added in Task 12)
- [ ] Atomic writes via `fs-atomic` (already in `src/lib/fs-atomic.ts`)
- [ ] Zod schema validates the existing-file shape before merging (graceful error on malformed JSON)
- [ ] Vitest unit test covers: fresh write, idempotent re-write, preservation of foreign entries, TOML-guard rejection with docs URL in message

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TOML parser dependency (one new dev dep)
- `src/lib/fs-atomic.ts` for atomic JSON writes
- Zod for the hooks.json schema

## Input Dependencies

- Task 7 (scaffold) provides the hook-spec definitions and adapter shape

## Output Artifacts

- `src/harnesses/codex/hooks-config.ts`
- `package.json` updated with new TOML parser dep
- Unit tests for the writer and the TOML guard

## Implementation Notes

<details>
<summary>Guidance</summary>

- Prefer `smol-toml` (zero-dep, modern, ESM-native) over `@iarna/toml` unless the repo already uses one.
- The TOML guard: parse the file, check `typeof parsed === 'object' && parsed.hooks && Object.keys(parsed.hooks).length > 0`. No regex. (See plan section "Technical Risks: TOML coexistence guard may produce false positives.")
- Error message format:
  ```
  Refusing to write .codex/hooks.json: .codex/config.toml already defines [hooks].
  Merge our entries by hand: <docs URL>
  ```
  Use the docs URL from Task 12 (`https://github.com/e0ipso/ai-knowledge-base/blob/main/docs/installation/codex-toml-hooks-coexistence.md`).
- Per `feedback_no_backwards_compat`: no silent-merge fallback. Hard error only.
- The path prefix marker (`node ./.codex/hooks/kb-`) lets us cleanly identify our entries on upgrade without storing extra metadata.

</details>
