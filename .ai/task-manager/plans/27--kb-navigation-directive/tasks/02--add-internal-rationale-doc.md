---
id: 2
group: "documentation"
dependencies: [1]
status: "pending"
created: 2026-05-21
skills:
  - markdown
---
# Create Project-Internal KB Navigation Rationale Doc

## Objective

Create `docs/internals/kb-navigation.md` — a maintainer-facing rationale page that captures the 3-layer KB navigation model (INDEX → grep `nodes/` with `-C 2` → full read), the surface-reachability argument for why the directive lives in `src/lib/session-start.ts`, the `-C 2` flag rationale, and an explicit "project-internal, does not ship to consumers" disclaimer — then list the new page in `docs/internals/index.md` so it appears in site navigation.

## Skills Required

- `markdown` — authoring a new Jekyll-style internals page that matches the frontmatter and structural conventions used by its sibling pages in `docs/internals/`.

## Acceptance Criteria

- [ ] `docs/internals/kb-navigation.md` exists at the repository root path `docs/internals/kb-navigation.md`.
- [ ] The new page opens with Jekyll frontmatter matching the sibling-page pattern in `docs/internals/`: at minimum `title:`, `parent: Internals`, and `nav_order:` set to a value that does not collide with existing sibling pages.
- [ ] The page contains a prominent "project-internal" statement (in the first paragraph or under a clearly-labeled callout) explicitly stating that the page documents intent for `@e0ipso/ai-knowledge-base` maintainers, that it is not shipped to consumer repos, and that it has no runtime effect.
- [ ] The page explains the 3-layer navigation model (INDEX → grep `nodes/` with `-C 2` → full node bodies for confirmed matches) and names the comparative source (`thedotmack/claude-mem`'s `mem-search` skill's `search` → `timeline` → `get_observations` workflow).
- [ ] The page explains the `-C 2` choice in terms of the `summary:` frontmatter field acting as a triage signal.
- [ ] The page explains why the directive lives in `src/lib/session-start.ts` and nowhere else — i.e., the surface-reachability argument: only the SessionStart payload is auto-injected into every consumer session across all three harnesses; consumer-facing markdown requires a voluntary read.
- [ ] The page contains an explicit cross-reference to `src/lib/session-start.ts` as the enforcement surface, phrased so a future reader understands that the source file is the source of truth and the doc describes intent only.
- [ ] `docs/internals/index.md` is updated: the existing bullet list under "Internals" gains a new entry pointing to `kb-navigation.md` with a one-line description matching the format of its siblings.
- [ ] `grep -l 'src/lib/session-start.ts' docs/internals/kb-navigation.md` returns the file path (the cross-reference is verifiable).
- [ ] No other files are touched — no `AGENTS.md` update, no root `README.md` update, no `docs/daily-use.md` or `docs/how-it-works.md` update, no `src/templates-source/knowledge-base/README.md` update.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- New file: `docs/internals/kb-navigation.md`.
- Modified file: `docs/internals/index.md` (one bullet added to the existing list).
- Frontmatter must follow the pattern observed in `docs/internals/architecture.md`, `hooks.md`, `schemas.md`, `prompts.md`, and `manual-test-plan.md`. Read at least one sibling page before writing to copy the exact key set and ordering.
- `nav_order:` should be chosen so the new page sits in a sensible position in the sidebar. Pick a value that does not collide with existing pages in `docs/internals/`; inspect the current values via `grep -h '^nav_order:' docs/internals/*.md` and choose accordingly.

## Input Dependencies

- Task 1 (`Inject KB Navigation Directive into SessionStart Payload and Pin It with a Test`). Task 2 depends on Task 1 because the doc cross-references the final directive wording and the enforcement surface line range. While the cross-reference itself does not require quoting the exact wording, the doc should be written after the directive is committed so any wording references match.

## Output Artifacts

- `docs/internals/kb-navigation.md` — the new project-internal rationale page.
- Updated `docs/internals/index.md` — bullet list extended with the new page.

## Implementation Notes

<details>
<summary>Step-by-step authoring</summary>

1. Before writing, read the frontmatter of `docs/internals/architecture.md` (and one or two other siblings) to confirm the exact frontmatter keys, casing, and ordering. Mirror that structure exactly.

2. Pick a `nav_order:` value. Run `grep -h '^nav_order:' docs/internals/*.md | sort -n` to see what is used. Choose a value that places the new page in a logical position (it does not need to be at the end — group it near `prompts.md` if that grouping feels natural, since both pages are about prompt-driven behavior).

3. Author the body. Suggested section structure (adjust if a more natural flow emerges):

   - **Intro / scope callout** — the "project-internal, does not ship to consumers, no runtime effect" statement. Put this first so a reader who lands on the page from the sidebar immediately knows the audience and the page's status.
   - **The 3-layer model** — INDEX → grep `nodes/` with `-C 2` → full node bodies for confirmed matches. Cite the comparative source: `thedotmack/claude-mem`'s `mem-search` skill (its `search` → `timeline` → `get_observations` workflow is the analogue).
   - **Why the SessionStart payload is the only viable surface** — the surface-reachability argument from the plan's Background section. Key point: only the additional-context payload built in `src/lib/session-start.ts` is auto-injected into every consumer session, across all three harnesses (Claude Code, Codex CLI, OpenCode). Consumer-facing markdown (KB `README.md`, project docs, the Jekyll site) requires a voluntary file read, which is the speculative read the directive aims to suppress.
   - **Why `-C 2`** — KB node frontmatter has a one-line `summary:` field per `src/lib/schemas.ts`. `grep -C 2 <term> nodes/` surfaces that `summary:` line in the same hit, giving the agent enough triage signal to decide whether to open the full body. Two extra tokens in the directive in exchange for a structural improvement to the second layer.
   - **Source of truth** — explicit statement that `src/lib/session-start.ts` is the enforcement surface; this doc describes intent. If the directive's wording changes, change it there. The cross-reference pattern matches what `docs/internals/hooks.md` already does for hook scripts.

4. Save the file at `docs/internals/kb-navigation.md`.

5. Open `docs/internals/index.md`. Add one new bullet to the existing list under `# Internals`, in the same `[Title](file.md) - one-line description` format as its neighbors. Suggested entry:

   ```markdown
   - [KB navigation](kb-navigation.md) - why the SessionStart payload carries a 3-layer navigation directive, and why it lives there and nowhere else.
   ```

   Place it in a sensible position in the list — adjacent to `prompts.md` is reasonable, since both are about prompt-shaped behavior.

6. Verify acceptance by running `grep -l 'src/lib/session-start.ts' docs/internals/kb-navigation.md` (must return the path) and `grep -l 'kb-navigation.md' docs/internals/index.md` (must return the path).

</details>

<details>
<summary>Constraints and things to avoid</summary>

- **Do not** add a frontmatter key that is not used by sibling pages. Match exactly. If sibling pages omit a key (e.g., `permalink:`), omit it here too.
- **Do not** update `AGENTS.md`, the root `README.md`, `docs/daily-use.md`, `docs/how-it-works.md`, or `src/templates-source/knowledge-base/README.md`. The plan explicitly enumerates these as out of scope and the Success Criteria verify the diff against `main` is empty for those paths.
- **Do not** quote the exact directive wording verbatim in the doc. The doc describes intent; the source file is the source of truth. Quoting the wording invites drift and undermines the "source of truth" line.
- **Do not** invent telemetry, tracking, or "did agents follow the directive?" measurement. The plan explicitly defers this as a separate, larger conversation.
- **Do not** add a second cross-reference to a file that does not exist (e.g., to `src/lib/schemas.ts` is fine because that file exists; do not invent paths).

</details>
