---
id: 7
group: "codex-adapter"
dependencies: [1, 2, 5]
status: "pending"
created: 2026-05-15
skills:
  - typescript
---

# Scaffold the Codex harness adapter module and register it

## Objective

Create `src/harnesses/codex/index.ts` exporting a `codexAdapter: HarnessAdapter`. Wire it into `src/harnesses/registry.ts`. Implement `paths(root)`, `hooks` (Stop + SessionStart only, no `SessionEnd`/`PreCompact`), and a minimal `install()`/`upgrade()` that copies templates and delegates hook registration to the (separate) hooks-config writer landing in Task 8. Implement `doctor()` checks: `codex --version` on PATH, hooks registered, skills installed under `.agents/skills/`.

## Skills Required

- typescript

## Acceptance Criteria

- [ ] `src/harnesses/codex/index.ts` exports `codexAdapter` of type `HarnessAdapter` with `id: 'codex'`
- [ ] `src/harnesses/registry.ts` registers it next to `claudeAdapter`
- [ ] `paths(root)` returns `{ dir: '.codex', skillsDir: '.agents/skills', hooksDir: '.codex/hooks', settingsFile: '.codex/hooks.json' }` (`commandsDir` omitted)
- [ ] `hooks` declares one `Stop` and two `SessionStart` entries (one of those marked `async: true` for the proposal-drain script)
- [ ] `install()` copies `templates/codex/hooks/*.mjs` into `.codex/hooks/`, copies `templates/codex/skills/kb-*/` into `.agents/skills/`, then invokes the hooks-config writer (Task 8)
- [ ] `upgrade()` is idempotent and overwrites the same set, preserving any user-edited `.agents/skills/kb-*/SKILL.md` overrides per the package's existing override conventions (matches Claude adapter behavior)
- [ ] `doctorChecks(paths)` runs three named checks: codex CLI on PATH, `.codex/hooks.json` contains our entries (or warn if `[hooks]` inline in `config.toml`), `.agents/skills/kb-{add,bootstrap,curate}/SKILL.md` all exist
- [ ] `runHeadless` and `parseTranscript`/`renderTranscript` may temporarily throw `not implemented` (filled in by Tasks 9 and 10) but the adapter is otherwise functional
- [ ] `npm run build` succeeds; `npm test` passes (add a basic registry-level test that `getHarness('codex')` returns the adapter)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `src/harnesses/codex/index.ts`, `install.ts`, `hook-spec.ts`, `doctor.ts`
- Uses `adapter.paths(root)` (Task 1), iterates `hooks` from `hook-spec.ts` (Task 2)

## Input Dependencies

- Task 1 (RepoPaths neutralization — needed for `adapter.paths()` contract)
- Task 2 (HookEvent vocabulary — Codex declares only `Stop` and `SessionStart`)
- Task 5 (init validator broadening — so `init --harnesses codex` doesn't get rejected)

## Output Artifacts

- Working Codex adapter scaffold registered in the global registry
- `install()`, `doctor()`, `paths()`, `hooks` all implemented

## Implementation Notes

<details>
<summary>Guidance</summary>

- Hook spec entries:
  ```ts
  export const codexHookSpecs: HookSpec[] = [
    { event: 'Stop', scriptPath: 'kb-capture.mjs' },
    { event: 'SessionStart', scriptPath: 'kb-session-start.mjs' },
    { event: 'SessionStart', scriptPath: 'kb-proposal-drain.mjs', async: true },
    { event: 'Stop', scriptPath: 'kb-lint-tick.mjs' }, // Codex has no SessionEnd; run lint on Stop instead
  ];
  ```
- Doctor `codex --version`: use `execa` with `reject: false`. Treat ENOENT as a failed error-level check.
- Doctor "Codex hooks registered": parse `.codex/hooks.json` if present and assert each entry in `codexHookSpecs` is present. If `.codex/config.toml` exists and has `[hooks]`, emit a warn-level check linking the new docs page.
- `install()` reads templates from `packageTemplatesDir()/codex/`; copies the skills tree into `.agents/skills/` (created if missing); copies hooks into `.codex/hooks/`; then calls the hooks-config writer from Task 8 to write `.codex/hooks.json`.
- Per `feedback_no_backwards_compat`: do not implement legacy/alternate Codex hook config locations. `.codex/hooks.json` is the canonical location for our entries.

</details>
