---
id: 9
group: "dogfood-migration"
dependencies: [4, 8]
status: "completed"
created: 2026-06-03
skills:
  - git
  - cli
---
# Migrate the dogfood knowledge base

## Objective
Move this repository's own knowledge base from `.ai/knowledge-base/` to
`.ai/analecta/` with git history preserved, rebrand node names/bodies that
reference old identifiers, and regenerate `INDEX.md`/`GRAPH.md` so the project
keeps dogfooding under the new name.

## Skills Required
- **git**: history-preserving `git mv` of the directory and node files.
- **cli**: regenerate `INDEX.md`/`GRAPH.md` via the built CLI.

## Acceptance Criteria
- [ ] `git mv .ai/knowledge-base .ai/analecta` performed; `.ai/knowledge-base/` no longer exists (`test ! -d .ai/knowledge-base`).
- [ ] `git log --follow .ai/analecta/INDEX.md` shows history predating the move (proves `git mv`).
- [ ] Node files whose **names** embed `kb-` referring to old skills (e.g. `map-kb-bootstrap-skill.md`) are renamed via `git mv` to the `ana-*` form.
- [ ] Node **bodies** referencing `/kb-*`, `.kbignore`, or `KB_*` are updated to the new terms.
- [ ] `INDEX.md` and `GRAPH.md` are regenerated via the CLI and all internal links resolve.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
The repo contains a live KB (~55 nodes) plus installed harness configs. The
directory substructure (`nodes/`, `_sessions/`, `_logs/`, `.state/`, `.config/`,
`INDEX.md`, `GRAPH.md`, `config.yaml`) is unchanged — only the base directory
name and brand-referencing node content/filenames change. Regeneration requires
the built CLI from task 8, which resolves the new `.ai/analecta` base from task 4.

## Input Dependencies
- Task 4 (path resolver now targets `.ai/analecta` — the `git mv` destination).
- Task 8 (built `dist/cli.js` able to regenerate INDEX/GRAPH under the new dir).

## Output Artifacts
- `.ai/analecta/` populated with the migrated, rebranded KB and freshly
  generated `INDEX.md`/`GRAPH.md`.

## Implementation Notes
<details>
<summary>Step-by-step</summary>

1. Move the directory preserving history: `git mv .ai/knowledge-base .ai/analecta`.
2. Find node files whose filenames embed `kb-` referring to the old skills:
   `find .ai/analecta -type f -name '*kb-*'`. For ones naming the old skills
   (e.g. `map-kb-bootstrap-skill.md`, `map-kb-curate-skill.md`,
   `map-kb-add-skill.md`), `git mv` them to the `ana-*` equivalent. Use judgment:
   rename names that refer to the renamed skills/commands; do not corrupt
   unrelated substrings.
3. Update node bodies: `grep -rIln -e '/kb-' -e '\.kbignore' -e 'KB_BUILDER_INTERNAL' -e 'KB_GITIGNORE_LINES' .ai/analecta`
   and rewrite those references to `/ana-*`, `.anaignore`, `ANALECTA_*`. Also fix
   any `[[map-kb-…]]` style cross-links to the renamed node names.
4. Regenerate the index and graph with the built CLI (use the repo's existing
   regeneration command, e.g. `node dist/cli.js doctor`/index-gen flow or the
   documented generate command) so `INDEX.md` and `GRAPH.md` reflect the renamed
   nodes and all links resolve.
5. Verify: `git log --follow .ai/analecta/INDEX.md` shows pre-move history;
   `test ! -d .ai/knowledge-base` passes;
   `grep -rIn -e '/kb-' -e '\.kbignore' -e 'KB_' .ai/analecta` returns only
   intentional matches.
</details>
