---
id: 6
group: "abstraction-refactor"
dependencies: []
status: "pending"
created: 2026-05-15
skills:
  - typescript
  - ci-cd
---

# Parameterize tsup build pipeline per-harness

## Objective

Today `tsup.config.ts` hard-codes the four Claude hook entry points. Generalize the second config block so it discovers `src/harnesses/<id>/hooks/*.ts` via a glob and writes `dist/hooks/<harness>/<name>.mjs` (or whatever path the install step expects). Adding a new harness becomes a pure drop-in.

## Skills Required

- typescript
- ci-cd (tsup bundler config, build scripts)

## Acceptance Criteria

- [ ] `tsup.config.ts` enumerates harness hook entry points by scanning `src/harnesses/*/hooks/*.ts` rather than naming each one
- [ ] Build output for Claude lands at the same paths as today (so the install step keeps working without changes): `templates/claude/hooks/<name>.mjs` (or `dist/hooks/<name>.mjs` if that's the current layout — preserve whatever the existing Claude install step copies from)
- [ ] When the Codex adapter (Task 7+) lands its hooks under `src/harnesses/codex/hooks/`, `npm run build` produces matching `.mjs` outputs without further config edits
- [ ] Build output byte-checked or runtime-tested to confirm the Claude hooks still execute identically (no regression in Claude install)
- [ ] `npm run build && npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `tsup` bundler config
- `globby` (already a dep, check `package.json`) or `fast-glob` for entry discovery
- Node `path`/`fs` for resolving entries at config time

## Input Dependencies

None (entry-point discovery is structural; doesn't depend on the other refactor tasks).

## Output Artifacts

- Parameterized `tsup.config.ts`
- Identical Claude build output (regression-free)

## Implementation Notes

<details>
<summary>Guidance</summary>

- Sketch:
  ```ts
  import { globbySync } from 'globby';
  const hookEntries: Record<string, string> = {};
  for (const p of globbySync('src/harnesses/*/hooks/*.ts')) {
    const m = p.match(/src\/harnesses\/([^/]+)\/hooks\/(.+)\.ts$/);
    if (!m) continue;
    hookEntries[`${m[1]}/${m[2]}`] = p;
  }
  ```
  Then use `outBase: 'src/harnesses'` and `outDir: 'templates'` (or wherever install.ts reads from) so the output mirrors `templates/<harness>/hooks/<name>.mjs`.
- Verify the Claude install step (`src/harnesses/claude/install.ts`) reads its hooks from whatever the current location is. If the current location is `dist/hooks/<name>.mjs`, decide whether to keep that flat layout (and let Claude pick by name only) or move to a per-harness subdir. The plan favors `templates/<harness>/hooks/<name>.mjs`; pick that.
- Update `src/harnesses/claude/install.ts` if needed to read from the new location.
- Per `feedback_no_backwards_compat`: do not keep the old flat path alongside the new layout.

</details>
