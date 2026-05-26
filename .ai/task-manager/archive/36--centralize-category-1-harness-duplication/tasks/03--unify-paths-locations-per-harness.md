---
id: 3
group: "within-harness-dedup"
dependencies: []
status: completed
created: 2026-05-26
skills:
  - typescript-modules
---
# Unify *Paths() and *Locations() per harness

## Objective
For each of the 4 harnesses, merge the overlapping `*Paths()` function (in `install.ts`) and `*Locations()` function (in `doctor.ts`) into a single path-resolution function. The doctor module imports from the unified source instead of defining its own copy.

## Skills Required
- TypeScript ESM module authoring and cross-module import refactoring

## Acceptance Criteria
- [ ] Each harness has exactly one path-resolution function that is shared between install.ts and doctor.ts
- [ ] `grep -rn "function.*Locations" src/harnesses/*/doctor.ts` returns zero function definitions (only imports or usage)
- [ ] No field from the old `*Locations()` functions is lost — every field is present in the unified function
- [ ] `npm run build` succeeds with no new errors
- [ ] `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

For each harness, the `*Paths()` (install.ts) and `*Locations()` (doctor.ts) return objects with overlapping but not identical fields. The unified function must return the superset of all fields.

### Claude
- `claudePaths()` returns: `{ dir, skillsDir, hooksDir, settingsFile }`
- `claudeLocations()` returns: `{ settingsFile, hooksDir, skillsDir }`
- **Overlap**: all Locations fields are already in Paths. Unified = claudePaths (no new fields needed).

### Codex
- `codexPaths()` returns: `{ dir, hooksDir, skillsDir, settingsFile }`
- `codexLocations()` returns: `{ hooksFile, configToml, hooksDir, skillsDir }`
- **Unique to Locations**: `hooksFile` (= `join(dir, 'hooks.json')`), `configToml` (= `join(dir, 'config.toml')`)
- **Note**: Paths has `settingsFile` which maps to `hooksFile` (same value: `join(dir, 'hooks.json')`) but different key name. The unified function should include both or use the more descriptive name.

### Cursor
- `cursorPaths()` returns: `{ dir, hooksDir, skillsDir, settingsFile }`
- `cursorLocations()` returns: `{ hooksFile, hooksDir, skillsDir }`
- **Unique to Locations**: `hooksFile` (= same value as `settingsFile`)

### OpenCode
- `openCodePaths()` returns: `{ dir, pluginsDir, kbHooksDir, skillsDir }`
- `openCodeLocations()` returns: `{ pluginsDir, pluginFile, kbHooksDir, skillsDir }`
- **Unique to Locations**: `pluginFile` (= `join(dir, 'plugins', 'kb.mjs')`)

## Input Dependencies
None — this task has no dependencies.

## Output Artifacts
- Modified: 4 install.ts files (unified function now exported, may include additional fields)
- Modified: 4 doctor.ts files (import unified function instead of defining local *Locations)

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

### Strategy

For each harness, take the `*Paths()` function in `install.ts` as the base (it already has the `dir` field and most paths). Add any fields unique to `*Locations()`. Export the unified function. In `doctor.ts`, import the unified function and use it instead of the local `*Locations()`.

### Claude harness

`claudeLocations()` has no fields that `claudePaths()` doesn't already have. Simply:
1. In `install.ts`: export `claudePaths` (add `export` keyword).
2. In `doctor.ts`: `import { claudePaths } from './install.js';` and replace `claudeLocations(paths.root)` with `claudePaths(paths.root)`. Delete the `claudeLocations` function. Update any field access if needed (the field names are identical: `settingsFile`, `hooksDir`, `skillsDir`).

### Codex harness

1. In `install.ts`: add `hooksFile` and `configToml` to the return object of `codexPaths()`:
   ```typescript
   export function codexPaths(root: string) {
     const dir = join(root, '.codex');
     return {
       dir,
       hooksDir: join(dir, 'hooks'),
       skillsDir: join(root, '.agents/skills'),
       settingsFile: join(dir, 'hooks.json'),
       hooksFile: join(dir, 'hooks.json'),
       configToml: join(dir, 'config.toml'),
     };
   }
   ```
   Note: `settingsFile` and `hooksFile` have the same value. Keep both for backwards compat with install.ts callers that use `settingsFile` and doctor.ts callers that use `hooksFile`.
2. In `doctor.ts`: `import { codexPaths } from './install.js';` and replace `codexLocations(paths.root)` with `codexPaths(paths.root)`. Delete `codexLocations`. Update `locs.hooksFile` etc. references — they should already match.

### Cursor harness

1. In `install.ts`: add `hooksFile` to the return object:
   ```typescript
   export function cursorPaths(root: string) {
     const dir = join(root, '.cursor');
     return {
       dir,
       hooksDir: join(dir, 'hooks'),
       skillsDir: join(dir, 'skills'),
       settingsFile: join(dir, 'hooks.json'),
       hooksFile: join(dir, 'hooks.json'),
     };
   }
   ```
2. In `doctor.ts`: import and use `cursorPaths`. Delete `cursorLocations`.

### OpenCode harness

1. In `install.ts`: add `pluginFile` to the return object:
   ```typescript
   export function openCodePaths(root: string) {
     const dir = join(root, '.opencode');
     return {
       dir,
       pluginsDir: join(dir, 'plugins'),
       kbHooksDir: join(dir, 'kb-hooks'),
       skillsDir: join(dir, 'skills'),
       pluginFile: join(dir, 'plugins', 'kb.mjs'),
     };
   }
   ```
2. In `doctor.ts`: import and use `openCodePaths`. Delete `openCodeLocations`.

### Verification

- `grep -rn "function.*Locations" src/harnesses/*/doctor.ts` — zero function definitions
- `npm run build` — zero errors
- `npm test` — all pass

</details>
