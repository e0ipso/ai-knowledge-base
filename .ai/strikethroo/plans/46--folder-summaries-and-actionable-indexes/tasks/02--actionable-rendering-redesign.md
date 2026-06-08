---
id: 2
group: "index-core"
dependencies: [1]
status: "pending"
created: 2026-06-08
skills:
  - typescript
  - vitest
complexity_score: 7
complexity_notes: "Single file (index-gen.ts) but multiple coupled rendering changes plus a new deterministic Jaccard ranking; all within one cohesive surface so kept as one atomic task rather than fragmenting the render pipeline."
---
# Rework `index.md`/`ENTRY.md` rendering: imperative pointers, embedded directive, breadcrumb, no statistics, proximity-ranked By topic

## Objective
Turn the passive, statistic-heavy generated bodies into an actionable
progressive-disclosure surface. In both `renderFolderIndex` and
`renderRootCatalog`: emit imperative `Load …` descent pointers that splice the
child's self-preserved `summary` (name fallback when absent), imperative
`Open …` leaf pointers, an embedded one-line descent directive sourced from
`KK_NAVIGATION_DIRECTIVE`, a `↑ Parent` breadcrumb on every non-root `index.md`,
**no** body statistics, valid Markdown link syntax, and a reworked `## By topic`
that lists per tag the ≤3 most-central whole-tree nodes (tag Jaccard) as
followable path+summary entries.

## Skills Required
- `typescript`: rewrite the render functions and add a deterministic Jaccard-centrality ranker in `src/lib/index-gen.ts`.
- `vitest`: rewrite/extend `tests/lib/index-gen.test.ts` to assert the new body shape and ranking determinism.

## Acceptance Criteria
- [ ] **Descent pointers** (Subfolders in `index.md`, Branches in `ENTRY.md`): `- Load [\`<name>/\`](nodes/<dir>/index.md) for more information on <child summary | Title-cased name fallback>.` — valid `[label](path)` syntax.
- [ ] **Leaf pointers** (Conventions/Components): `- Open [**<title>**](<relPath>) to learn about: <summary> <#tags>`.
- [ ] **Embedded descent directive**: a compact, deterministic single line derived from `KK_NAVIGATION_DIRECTIVE` is rendered into every `index.md` and `ENTRY.md` body. The constant remains the single source of truth (do not copy its text).
- [ ] **Parent breadcrumb**: every non-root `index.md` renders `↑ Parent: [<parent name>](../index.md)`; the root `ENTRY.md` and root `nodes/index.md` omit it.
- [ ] **No statistics**: the `_N node(s) • ~T estimated tokens_` lines, the `(D here, T in subtree)` rollups, and the branch `(N)` counts are all removed from bodies. `nodes_hash` and `node_count` remain in frontmatter; `FolderMetrics` are still computed and returned (rebalance consumes them) but never printed.
- [ ] **By topic**: for each tag present among the folder's DIRECT leaves (bucket set and order unchanged: size DESC then alpha), list **at most 3** whole-tree nodes carrying that tag as `Open [**title**](path) — <summary>`, ranked by centrality = sum of tag Jaccard (`|A∩B|/|A∪B|`) against the other members of that tag's whole-tree cohort, ties broken by global in-degree then title. Output is deterministic.
- [ ] The whole-tree `## By topic` content is excluded from the per-folder `nodes_hash` (paired with Task 1's hash boundary); a tag change in a distant folder reorders the rendered block but leaves this folder's frontmatter `nodes_hash` unchanged.
- [ ] Tests cover: pointer rendering with summary present vs name fallback; directive present exactly once per body; breadcrumb on non-root only; absence of every statistic substring; By-topic ≤3 entries with path+summary and deterministic Jaccard ordering; two consecutive rebuilds byte-identical (Success Criterion 7).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- All edits are in `src/lib/index-gen.ts`: `renderFolderIndex` (`:348`), `renderRootCatalog` (`:165`), `renderTagIndex` (`:100`, fully reworked), `renderBullet` (`:80`, replaced by imperative `Open` form), and `deterministicIntent` (`:241`, now a fallback only).
- Import `KK_NAVIGATION_DIRECTIVE` from `src/lib/session-start.js`. Derive the embedded one-line form deterministically from it (e.g. a constant single-line condensation, or render the constant itself if a single line is acceptable). Do not duplicate the prose as a second literal.
- Jaccard cohort: for a tag `t`, the cohort is every whole-tree node carrying `t`. A node's score is `Σ jaccard(tags(node), tags(other))` over the other cohort members. Reuse `computeInDegree` for the tie-break.
- Child summaries come from the harvested map Task 1 threads into the render args; the fallback is `deterministicIntent(dir)`.

## Input Dependencies
- Task 1: the self-preserved `summary` field and the harvested-summary map threaded into the render functions; the per-folder hash boundary it establishes.

## Output Artifacts
- The redesigned `index.md`/`ENTRY.md` bodies that satisfy Success Criteria 1, 2, 7 and feed the SessionStart de-dup (Task 3) and the dogfood backfill (Task 7).

## Implementation Notes
This is the largest single surface but is one cohesive render pipeline in one
file; splitting "By topic" out would duplicate the shared comparators and the
node-set plumbing. Keep it atomic.

<details>
<summary>Detailed implementation guidance</summary>

1. **Descent pointers.** Replace the current Subfolders bullet
   (`index-gen.ts:373`) and the Branches bullet (`:192`) with:
   ```
   - Load [`<name>/`](<posix.join('nodes', sub, 'index.md')>) for more information on <summary | deterministicIntent(sub)>.
   ```
   The summary is the *child folder's* harvested summary, looked up by the
   child's `relDir`. End the sentence with a period; if the summary already ends
   with terminal punctuation, do not double it.

2. **Leaf pointers.** Replace `renderBullet`:
   ```
   - Open [**<title>**](<relPath>) to learn about: <summary><tagPart>
   ```
   where `tagPart` is the existing ` #tag` join. Drop the leading `**title**
   [path]` passive form. Keep kind-faceted sections (`## Conventions (how we
   build)`, `## Components (what exists)`) and their `_None yet._` empties.

3. **Embedded directive.** Add a single line to every body (folder + root). It
   must derive from `KK_NAVIGATION_DIRECTIVE`. Simplest correct approach: render
   the constant verbatim (it is already one logical line prefixed with `> `).
   Place it near the top, after the title/breadcrumb, before Subfolders/Branches.
   Tests later assert the SessionStart-injected ENTRY contains it exactly once,
   so do NOT also leave the hook appending it (that removal is Task 3).

4. **Parent breadcrumb.** For a non-root folder, the parent index is always
   `../index.md` relative to the folder. Render
   `↑ Parent: [<parentName>](../index.md)` where `parentName` is the parent
   folder's leaf segment (root parent name is the tree root — for a top-level
   branch the parent is the root, label it e.g. `kenkeep` or the root folder
   name; pick one and assert it). Root `ENTRY.md` and root `nodes/index.md` get
   no breadcrumb.

5. **Strip statistics.** Remove:
   - `_${leaves.length} node(s) in this folder • ~${estimatedTokens} estimated tokens_` (`:362`)
   - the whole-tree `_N node(s) across … estimated tokens_` line in the catalog (`:172`)
   - `(${stats.directLeaves} node(s) here, ${stats.totalLeaves} in subtree)` (`:376`)
   - the branch `(${count})` suffix (`:192`)
   Keep `FolderMetrics` computation (`:306`) and `rollupStats` if still needed by
   metrics, but stop printing rollups. `estimateTokens` may remain for
   `FolderMetrics.leafSize`.

6. **By topic rework.** Rewrite `renderTagIndex`. Signature must now see the
   WHOLE-TREE node set and each node's harvested-or-frontmatter `summary`, not
   just the folder's leaves, so pass `allNodes` plus a summary accessor. Steps:
   - Bucket the folder's DIRECT leaves' tags (unchanged bucket set/order: size
     DESC then alpha).
   - For each such tag, take the whole-tree cohort (all nodes with that tag),
     score each by summed tag-Jaccard against the rest of the cohort, sort by
     score DESC then in-degree DESC then title, take the top 3.
   - Render `- Open [**<title>**](<path>) — <summary>` per entry.
   - Empty-tag folder still renders `## By topic` with `_No tags yet._`.
   - Exclude this block's bytes from `hashLeaves` (it already is, since
     `hashLeaves` hashes leaf files, not the rendered body — just confirm with a
     test that a distant tag change does not move this folder's `nodes_hash`).

7. **Determinism.** All sorts must be total (final tie-break on a unique key like
   id or title). Add a test that runs `generateIndex` twice and asserts
   byte-identical `folders`/`rootCatalog` output (Success Criterion 7).

**Test philosophy — "write a few tests, mostly integration".** Meaningful tests
verify custom business logic, critical paths, and edge cases specific to this
application. Test *your* code, not the framework. WRITE tests for: custom
business logic and algorithms; critical workflows and data transformations; edge
cases and error conditions for core functionality; integration points; complex
validation. Do NOT write tests for: third-party library functionality; framework
features; simple CRUD without custom logic; trivial getters/setters or static
config; obvious functionality that would break immediately if incorrect. Combine
related scenarios into a single test; favor integration/critical-path coverage
over per-method unit tests. The Jaccard ranking and the full-body render shape
are the custom logic to cover; assert one representative rendered body end-to-end
rather than one micro-test per line.
</details>
