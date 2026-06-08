---
id: 1
group: "index-core"
dependencies: []
status: "completed"
created: 2026-06-08
skills:
  - typescript
  - vitest
---
# Add optional folder `summary` to the index schema and self-preserve it across rebuilds

## Objective
Introduce the single new primitive the whole plan rests on: an optional
`summary: string` on `IndexFrontmatterSchema`, harvested from each folder's
existing `index.md`/`ENTRY.md` before regeneration and re-stamped into the
freshly generated frontmatter, so a folder's one-line description survives the
otherwise-total deterministic rebuild. Also exclude the (later) whole-tree
`## By topic` block from the per-folder `nodes_hash` so cross-tree churn cannot
perturb an unrelated folder's stability hash.

## Skills Required
- `typescript`: Zod schema evolution and `gray-matter` frontmatter round-trip in `src/lib/schemas.ts` and `src/lib/index-gen.ts`.
- `vitest`: extend `tests/lib/index-gen.test.ts` to prove self-preserve and hash localization.

## Acceptance Criteria
- [ ] `IndexFrontmatterSchema` (`src/lib/schemas.ts:207`) gains `summary: z.string().optional()`; `GraphFrontmatterSchema` is untouched.
- [ ] `generateIndex` (`src/lib/index-gen.ts:260`) takes a snapshot of every existing folder `index.md` and the root `ENTRY.md` `summary` BEFORE any file is overwritten (harvest reads from `nodesDir`/the kk dir on disk), and re-stamps each value into the regenerated frontmatter for the matching folder.
- [ ] A brand-new folder (no prior `index.md`) or an empty-string `summary` is treated as absent (no `summary` key emitted, not `summary: ""`).
- [ ] The generated `summary` value is purely carried — `generateIndex` never invents or mutates it.
- [ ] The per-folder `nodes_hash` continues to hash only the folder's own direct leaves (`hashLeaves`), and the eventual cross-tree `## By topic` content is NOT folded into that hash. The GLOBAL `ENTRY.md` `nodes_hash` still covers the whole leaf set.
- [ ] Tests: editing one leaf and rebuilding leaves every unrelated folder's `summary` byte-stable; a folder with a prior `summary` keeps it across a rebuild; a folder without one emits none.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- `gray-matter` is already the (de)serializer; the harvest must parse the prior on-disk file with `matter()` and `IndexFrontmatterSchema.safeParse` (tolerate a missing/extra `summary`).
- `generateIndex` currently returns `GeneratedIndex` with `folders: Map<relDir, FolderIndex>` and a `rootCatalog` string. The harvested summaries must be threaded into both `renderFolderIndex` and `renderRootCatalog` frontmatter assembly (the rendering bodies that *consume* the summary are Task 2; this task only persists the field).
- The root summary lives in `ENTRY.md` frontmatter; harvest it from the entry-catalog file path the rebuild writes (`.ai/kenkeep/ENTRY.md`), not from `nodes/index.md`.

## Input Dependencies
None. This is the foundation task.

## Output Artifacts
- `IndexFrontmatterSchema.summary` (optional) available to every consumer.
- `generateIndex` self-preserve behavior that Tasks 2, 4, and 5 build on.

## Implementation Notes
This task changes only persistence/carrying, not rendering. The visible body
(Load/Open pointers, By-topic rework) is Task 2; keep that out of scope here so
the diff stays reviewable.

<details>
<summary>Detailed implementation guidance</summary>

1. **Schema.** In `src/lib/schemas.ts`, change `IndexFrontmatterSchema` to:
   ```ts
   export const IndexFrontmatterSchema = z.object({
     schema_version: z.literal(NODE_SCHEMA_VERSION),
     nodes_hash: z.string(),
     node_count: z.number().int().nonnegative(),
     summary: z.string().optional(),
   });
   ```
   Do not bump `NODE_SCHEMA_VERSION` (stays 2). `GraphFrontmatterSchema` is unchanged.

2. **Harvest before overwrite.** `generateIndex(nodesDir)` is a pure function of
   the leaf set today. Add a harvest pass that reads the *current* on-disk
   `index.md` of every directory it is about to regenerate, plus the root
   `ENTRY.md`. Because `index rebuild` writes files only after `generateIndex`
   returns its bodies, reading inside `generateIndex` sees the pre-rebuild state
   — that is the snapshot the plan requires (Risk: "self-preserve ordering").
   Build a `Map<relDir, string>` of non-empty summaries.
   - `generateIndex` knows each `relDir`; resolve the on-disk index path as
     `relDir === '' ? join(nodesDir, INDEX_FILENAME) : join(nodesDir, ...relDir.split('/'), INDEX_FILENAME)`.
   - For the root catalog summary, the on-disk file is the entry catalog, which
     lives OUTSIDE `nodesDir` at `<kkDir>/ENTRY.md`. `generateIndex` currently
     only receives `nodesDir`. Add an optional second parameter (e.g.
     `entryFile?: string`) OR harvest the root summary in the caller
     (`runIndexRebuild`, which knows `paths.kkDir`) and pass it in. Prefer the
     explicit parameter so `generateIndex` stays the single self-preserve owner;
     wire `runIndexRebuild` (`src/commands/index-rebuild.ts:81`) and any other
     caller (curator, `node add`, rebalance rebuild) to pass the entry-catalog
     path. Verify all `generateIndex(` call sites compile.
   - Use `matter()` + `IndexFrontmatterSchema.safeParse`; on parse failure or a
     missing/empty `summary`, treat as absent.

3. **Re-stamp.** In `renderFolderIndex` and `renderRootCatalog`, when assembling
   the `IndexFrontmatterSchema.parse({...})` object, include
   `...(summary ? { summary } : {})` so an empty/absent value emits no key. Thread
   the harvested summary for that folder into the render args.

4. **Hash boundary.** The per-folder `nodes_hash` is already `hashLeaves(leaves)`
   (`index-gen.ts:304`) — only the folder's direct leaves. Task 2 adds a
   whole-tree `## By topic`; ensure that block is rendered into the *body* but
   never fed into `hashLeaves`. There is nothing to change here beyond a guard
   comment, but assert it with a test in Task 2's scope or here: a tag change in
   a distant folder must not alter this folder's frontmatter `nodes_hash`.

5. **Tests** (`tests/lib/index-gen.test.ts`):
   - Generate a tree, write a `summary` into a folder's `index.md`, regenerate,
     assert the regenerated frontmatter still carries the identical `summary`.
   - Assert a folder with no prior file emits no `summary` key.
   - Assert editing one leaf body and regenerating leaves all other folders'
     `summary` lines byte-identical (Success Criterion 3).

**Test philosophy — "write a few tests, mostly integration".** Meaningful tests
verify custom business logic, critical paths, and edge cases specific to this
application. Test *your* code, not the framework. WRITE tests for: custom
business logic and algorithms; critical workflows and data transformations; edge
cases and error conditions for core functionality; integration points; complex
validation. Do NOT write tests for: third-party library functionality; framework
features; simple CRUD without custom logic; trivial getters/setters or static
config; obvious functionality that would break immediately if incorrect. Combine
related scenarios into a single test; favor integration/critical-path coverage
over per-method unit tests. Here, the self-preserve round-trip and hash
localization ARE the custom logic worth covering; do not add tests for
`gray-matter` or Zod themselves.
</details>
