---
id: 1
group: "abstraction-refactor"
dependencies: []
status: "pending"
created: 2026-05-15
skills:
  - typescript
---

# Neutralize RepoPaths and route harness paths through the adapter

## Objective

Strip Claude-specific fields (`claudeDir`, `claudeCommandsDir`, `claudeSkillsDir`, `claudeHooksDir`, `claudeSettingsFile`) from `RepoPaths` in `src/lib/paths.ts`, and replace every consumer reference with calls into a new `adapter.paths(root)` method on `HarnessAdapter`. This is the prerequisite for adding a second adapter without multiplying per-harness fields on a shared type.

## Skills Required

- typescript (Zod-free refactor across many call sites, type-level work)

## Acceptance Criteria

- [ ] `RepoPaths` interface in `src/lib/paths.ts` no longer contains any field whose name starts with `claude`
- [ ] `HarnessAdapter` (in `src/harnesses/types.ts`) gains a `paths(root: string): HarnessPaths` method (or readonly property — pick one and apply consistently)
- [ ] Claude adapter implements `paths(root)` returning `{ dir, commandsDir, skillsDir, hooksDir, settingsFile }` for `.claude/`
- [ ] Every caller previously reading `paths.claudeDir`/`paths.claudeHooksDir`/etc. now goes through `getHarness(id).paths(root)` (or a passed-in adapter)
- [ ] No occurrences of `claude` paths outside `src/harnesses/claude/` (verify with `grep -rn "claudeDir\|claudeHooksDir\|claudeSkillsDir\|claudeCommandsDir\|claudeSettingsFile" src/`)
- [ ] `npm run build` succeeds; `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TypeScript types (`HarnessPaths` shape lives in `src/harnesses/types.ts`)
- Refactor across `src/commands/init.ts`, `src/commands/doctor.ts`, the Claude adapter's `install.ts`/`doctor.ts`/`hooks-config.ts`, and any tests that reference Claude paths

## Input Dependencies

None.

## Output Artifacts

- Cleaned `RepoPaths` interface
- New `adapter.paths()` API on `HarnessAdapter`
- Migrated call sites

## Implementation Notes

<details>
<summary>Step-by-step guidance</summary>

1. In `src/harnesses/types.ts`, add:
   ```ts
   export interface HarnessPaths {
     dir: string;            // e.g. `.claude/` or `.codex/`
     commandsDir?: string;   // optional — Codex has no commands dir
     skillsDir: string;      // `.claude/skills/` or `.agents/skills/`
     hooksDir: string;       // `.claude/hooks/` or `.codex/hooks/`
     settingsFile?: string;  // `.claude/settings.json` or `.codex/hooks.json`
   }
   ```
   Add `paths(root: string): HarnessPaths` to `HarnessAdapter`.

2. In `src/lib/paths.ts`, remove `claudeDir`, `claudeCommandsDir`, `claudeSkillsDir`, `claudeHooksDir`, `claudeSettingsFile` from `RepoPaths`. Update `repoPaths()` accordingly. Keep `gitignoreFile`.

3. In `src/harnesses/claude/index.ts`, add the `paths(root)` implementation that returns the same five paths previously on `RepoPaths`.

4. `grep -rn "claudeDir\|claudeHooksDir\|claudeSkillsDir\|claudeCommandsDir\|claudeSettingsFile"` and migrate each caller. Most live in `src/commands/init.ts`, `src/commands/doctor.ts`, and the Claude adapter's own files (which can read them directly via `this.paths(root)`).

5. No backwards-compat aliases (per `feedback_no_backwards_compat`): delete the old fields outright.

6. Update tests under `tests/` that reference these fields.

</details>
