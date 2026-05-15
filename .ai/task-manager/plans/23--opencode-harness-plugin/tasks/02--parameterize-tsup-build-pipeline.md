---
id: 2
group: "abstraction-refactor"
dependencies: []
status: "completed"
created: 2026-05-15
skills:
  - typescript
  - build
---

# Parameterize tsup to discover per-adapter hooks/ AND plugins/ artifacts

## Objective

`tsup.config.ts` today discovers `src/harnesses/<id>/hooks/*.ts` and bundles each into `templates/<id>/hooks/<name>.mjs`. Extend it to also discover `src/harnesses/<id>/plugins/*.ts` and emit `templates/<id>/plugins/<name>.mjs`. Each adapter declares its layout by directory presence; no central enum of harness ids in the build config.

For OpenCode specifically, the build must also emit per-event Node scripts under `templates/opencode/kb-hooks/*.mjs` (the plugin spawns these). Decide on either: (a) a third per-adapter dir `src/harnesses/opencode/hooks/*.ts -> templates/opencode/kb-hooks/*.mjs` (renaming the output dir), or (b) keep `hooks/` -> `hooks/` and have the OpenCode install rename on copy. Pick (a) for symmetry: the build config detects when an adapter declares `pluginsDir` and renames its `hooks/` output to `kb-hooks/` to avoid colliding with OpenCode's reserved `hooks/` semantics in `.opencode/`. Document the chosen convention in the build config.

## Skills Required

- typescript
- build

## Acceptance Criteria

- [ ] `tsup.config.ts` discovers `src/harnesses/<id>/plugins/*.ts` for any adapter and emits `templates/<id>/plugins/<name>.mjs`
- [ ] `tsup.config.ts` discovers `src/harnesses/<id>/hooks/*.ts` for any adapter and emits artifacts: if the adapter has both `hooks/` and `plugins/`, hook scripts go to `templates/<id>/kb-hooks/<name>.mjs`; otherwise to `templates/<id>/hooks/<name>.mjs`
- [ ] Build output for Claude and Codex is byte-identical or behaviorally identical to current (`diff -r templates/claude` and `diff -r templates/codex` against a pre-change build show no functional differences)
- [ ] No central enum/list of harness ids in `tsup.config.ts`; discovery is by directory glob
- [ ] `npm run build` succeeds end-to-end

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `tsup.config.ts`
- Node `fs` for directory discovery
- Existing tsup multi-entry pattern

## Input Dependencies

None.

## Output Artifacts

- Build pipeline that handles both `hooks/` and `plugins/` adapter directories
- Convention: adapters with `pluginsDir` get their hook scripts in `kb-hooks/` to avoid colliding with the plugin runtime's reserved `hooks/` directory

## Implementation Notes

<details>
<summary>Guidance</summary>

- Use `fs.readdirSync('src/harnesses', { withFileTypes: true })` to enumerate adapter ids. For each id, check whether `hooks/` and/or `plugins/` exist and add entries accordingly.
- The OpenCode adapter (Task 4) will create `src/harnesses/opencode/hooks/` and `src/harnesses/opencode/plugins/`. The build emits both. The hook scripts land in `templates/opencode/kb-hooks/` (renamed from `hooks/`) because `.opencode/hooks/` is reserved by the OpenCode runtime for its own plugin output and we use `.opencode/kb-hooks/` as our private dir.
- Document the rename convention with a comment in `tsup.config.ts` referencing this plan.
- Verify pre/post equivalence for Claude and Codex with a quick `find templates/claude -type f -name '*.mjs' | xargs sha256sum` snapshot.

</details>
