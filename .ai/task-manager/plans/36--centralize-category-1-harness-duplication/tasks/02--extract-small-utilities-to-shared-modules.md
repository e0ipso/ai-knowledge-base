---
id: 2
group: "shared-lib-extraction"
dependencies: []
status: completed
created: 2026-05-26
skills:
  - typescript-modules
---
# Extract pickModelChoice, loadProposalPrompt, and copyTree into shared modules

## Objective
Move three small duplicated utility functions into their natural homes in `src/lib/`:
- `pickModelChoice()` → `src/lib/settings.ts`
- `loadProposalPrompt()` → `src/lib/proposal-drain.ts`
- `copyTree()` → `src/lib/fs-atomic.ts`

Delete all per-harness copies and update imports.

## Skills Required
- TypeScript ESM module authoring, import management, and type re-export patterns

## Acceptance Criteria
- [ ] `grep -rn "function pickModelChoice\|function loadProposalPrompt\|function copyTree" src/harnesses/` returns zero matches
- [ ] `pickModelChoice` is exported from `src/lib/settings.ts`
- [ ] `loadProposalPrompt` is exported from `src/lib/proposal-drain.ts`
- [ ] `copyTree` is exported from `src/lib/fs-atomic.ts`
- [ ] `npm run build` succeeds with no new errors
- [ ] `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

### pickModelChoice → src/lib/settings.ts
- The function depends on `EffectiveSettings` (already in settings.ts) and `ModelChoiceRole` (currently in `src/harnesses/types.ts` line 199).
- **Important**: `ModelChoiceRole` is a simple type alias (`'proposal' | 'curator' | 'bootstrap'`). To avoid a lib→harnesses dependency, either: (a) move the `ModelChoiceRole` type definition to `src/lib/settings.ts` or `src/lib/schemas.ts` and re-export from `src/harnesses/types.ts`, or (b) define the type inline in settings.ts. Option (a) is preferred since the type is used by both layers.
- Update 4 files: `src/harnesses/{claude,codex,cursor,opencode}/opts.ts` — replace local definitions with imports from `../../lib/settings.js`.
- Also update `src/harnesses/types.ts` if ModelChoiceRole is moved.

### loadProposalPrompt → src/lib/proposal-drain.ts
- The function depends on `existsSync`, `readFileSync` from `node:fs`, `join` from `node:path`, and `packageTemplatesDir()` from `src/lib/paths.ts`.
- `proposal-drain.ts` already imports `join` from `node:path`, `existsSync`/`readFileSync` from `node:fs`. It only needs to add `packageTemplatesDir` import from `./paths.js`.
- Update 3 files: `src/harnesses/{codex,cursor,opencode}/hooks/kb-proposal-drain.ts`
- Import path from hooks: `../../../lib/proposal-drain.js`

### copyTree → src/lib/fs-atomic.ts
- The function depends on `existsSync`, `mkdirSync`, `cpSync` from `node:fs`. `fs-atomic.ts` already imports `existsSync` and `mkdirSync`; add `cpSync` to the existing import.
- Update 4 files: `src/harnesses/{claude,codex,cursor,opencode}/install.ts`
- Import path from install files: `../../lib/fs-atomic.js`

## Input Dependencies
None — this task has no dependencies.

## Output Artifacts
- Modified: `src/lib/settings.ts` (+ pickModelChoice export, possibly + ModelChoiceRole type)
- Modified: `src/lib/proposal-drain.ts` (+ loadProposalPrompt export)
- Modified: `src/lib/fs-atomic.ts` (+ copyTree export)
- Modified: 4 opts.ts files, 3 kb-proposal-drain.ts hook files, 4 install.ts files (11 total)
- Possibly modified: `src/harnesses/types.ts` (if ModelChoiceRole is moved)

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

### Part A: pickModelChoice

1. **Decide where ModelChoiceRole lives.** Check `src/harnesses/types.ts:199`:
   ```typescript
   export type ModelChoiceRole = 'proposal' | 'curator' | 'bootstrap';
   ```
   Move this type to `src/lib/settings.ts` (it's a settings concept — which model role to pick). Then in `src/harnesses/types.ts`, change to: `export type { ModelChoiceRole } from '../lib/settings.js';` to maintain backwards compatibility for any other consumers.

2. **Add pickModelChoice to settings.ts.** Append:
   ```typescript
   export type ModelChoiceRole = 'proposal' | 'curator' | 'bootstrap';

   export function pickModelChoice(
     settings: EffectiveSettings,
     role: ModelChoiceRole
   ): ModelChoice | undefined {
     switch (role) {
       case 'proposal':
         return settings.proposalModel;
       case 'curator':
         return settings.curatorModel;
       case 'bootstrap':
         return settings.bootstrapModel;
     }
   }
   ```

3. **Update each opts.ts.** Replace local `function pickModelChoice` with `import { pickModelChoice } from '../../lib/settings.js'`. Remove the `ModelChoiceRole` import from `../types.js` if it's now re-exported (or adjust the import source).

### Part B: loadProposalPrompt

1. **Add to proposal-drain.ts.** Add `import { packageTemplatesDir } from './paths.js';` to proposal-drain.ts imports. Append the function:
   ```typescript
   export function loadProposalPrompt(promptsDir: string): string | null {
     const override = join(promptsDir, 'proposal-extract.md');
     if (existsSync(override)) return readFileSync(override, 'utf8');
     const bundled = join(packageTemplatesDir(), 'prompts/proposal-extract.md');
     if (existsSync(bundled)) return readFileSync(bundled, 'utf8');
     return null;
   }
   ```

2. **Update 3 hook files.** In each `kb-proposal-drain.ts` (codex, cursor, opencode): add `import { loadProposalPrompt } from '../../../lib/proposal-drain.js';`, delete the local function definition, and remove any now-unused imports (`packageTemplatesDir` if it was only used by the deleted function).

### Part C: copyTree

1. **Add to fs-atomic.ts.** Add `cpSync` to the existing `node:fs` import. Append:
   ```typescript
   export function copyTree(src: string, dest: string): void {
     if (!existsSync(src)) return;
     mkdirSync(dest, { recursive: true });
     cpSync(src, dest, { recursive: true, force: true });
   }
   ```

2. **Update 4 install.ts files.** Add `import { copyTree } from '../../lib/fs-atomic.js'`, delete local definition, remove any now-unused `cpSync`/`mkdirSync`/`existsSync` imports if they were only used by `copyTree`.

### Verification

Run after all three parts:
- `grep -rn "function pickModelChoice\|function loadProposalPrompt\|function copyTree" src/harnesses/` — zero matches
- `npm run build` — zero errors
- `npm test` — all pass

</details>
