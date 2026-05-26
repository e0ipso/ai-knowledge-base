---
id: 1
group: "shared-lib-extraction"
dependencies: []
status: completed
created: 2026-05-26
skills:
  - typescript-modules
---
# Extract readStdin() into src/lib/stdin.ts

## Objective
Create a new shared module `src/lib/stdin.ts` exporting `readStdin()`, then replace all 15 identical private definitions in harness hook files with imports from the shared module.

## Skills Required
- TypeScript ESM module authoring and import management

## Acceptance Criteria
- [ ] `src/lib/stdin.ts` exists and exports `readStdin(): Promise<string>`
- [ ] `grep -rn "function readStdin" src/harnesses/` returns zero matches
- [ ] All 15 hook files import `readStdin` from `../../../lib/stdin.js`
- [ ] `npm run build` succeeds with no new errors
- [ ] `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Create `src/lib/stdin.ts` with the canonical `readStdin()` implementation (reads all of stdin into a string via `process.stdin`)
- The function signature is: `export function readStdin(): Promise<string>`
- Update imports in these 15 files (4 harnesses × 4 hooks, minus claude's kb-proposal-drain which doesn't have it):
  - `src/harnesses/claude/hooks/kb-capture.ts`
  - `src/harnesses/claude/hooks/kb-lint-tick.ts`
  - `src/harnesses/claude/hooks/kb-session-start.ts`
  - `src/harnesses/codex/hooks/kb-capture.ts`
  - `src/harnesses/codex/hooks/kb-lint-tick.ts`
  - `src/harnesses/codex/hooks/kb-session-start.ts`
  - `src/harnesses/codex/hooks/kb-proposal-drain.ts`
  - `src/harnesses/cursor/hooks/kb-capture.ts`
  - `src/harnesses/cursor/hooks/kb-lint-tick.ts`
  - `src/harnesses/cursor/hooks/kb-session-start.ts`
  - `src/harnesses/cursor/hooks/kb-proposal-drain.ts`
  - `src/harnesses/opencode/hooks/kb-capture.ts`
  - `src/harnesses/opencode/hooks/kb-lint-tick.ts`
  - `src/harnesses/opencode/hooks/kb-session-start.ts`
  - `src/harnesses/opencode/hooks/kb-proposal-drain.ts`

## Input Dependencies
None — this task has no dependencies.

## Output Artifacts
- New file: `src/lib/stdin.ts`
- 15 modified hook files with local `readStdin()` definitions removed and replaced by imports

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

### Step 1: Create the shared module

Create `src/lib/stdin.ts`. Copy the canonical implementation from any of the 15 hook files (they are all byte-for-byte identical). The function body is:

```typescript
export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}
```

Verify the exact body by reading one of the source files — do not blindly trust this snippet if it differs.

### Step 2: Update each hook file

For each of the 15 files:
1. Add `import { readStdin } from '../../../lib/stdin.js';` to the imports section. The relative path `../../../lib/` is the established pattern — hooks are at `src/harnesses/<harness>/hooks/` so `../../../lib/` reaches `src/lib/`.
2. Delete the entire `function readStdin(): Promise<string> { ... }` block.
3. Do NOT change any call sites — `const raw = await readStdin()` remains identical.

### Step 3: Verify

Run `grep -rn "function readStdin" src/harnesses/` — expect zero matches.
Run `npm run build` — expect zero errors.
Run `npm test` — expect all tests to pass.

</details>
