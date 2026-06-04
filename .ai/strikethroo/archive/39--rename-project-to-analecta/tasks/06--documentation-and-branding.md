---
id: 6
group: "documentation"
dependencies: []
status: "completed"
created: 2026-06-03
skills:
  - technical-writing
  - jekyll
---
# Documentation & branding

## Objective
Rebrand all human- and AI-facing documentation to describe `analecta`: the
top-level docs, the Jekyll docs site, and a new breaking-change CHANGELOG entry
with the consumer upgrade steps.

## Skills Required
- **technical-writing**: rebrand README/AGENTS/PRD/CONTRIBUTING and author the CHANGELOG entry.
- **jekyll**: update the docs site config (title/URL/baseurl) and rename the internal navigation page.

## Acceptance Criteria
- [ ] `README.md`, `AGENTS.md`, `PRD.md`, `CONTRIBUTING.md` are rebranded: package name, install/usage commands, `/ana-*` commands, `.ai/analecta/` paths, docs URL, and AGENTS' opening identity line + structure section (hook filenames, `ana-hooks/`, env vars, skills).
- [ ] The `docs/` Jekyll site has its title/site URL/baseurl updated to `analecta`; `docs/internals/kb-navigation.md` is renamed (via `git mv`) to `ana-navigation.md` and links to it updated.
- [ ] A new `CHANGELOG.md` entry documents the breaking rename with explicit upgrade steps: move `.ai/knowledge-base/` → `.ai/analecta/`, rename `.kbignore` → `.anaignore`, adopt `/ana-*`, re-run `init`. Existing changelog history is **not** rewritten.
- [ ] Product noun usage is rebranded (collection = "an analecta", node = "an analect"); generic explanatory "knowledge base" prose may remain where it aids a newcomer.
- [ ] `grep -rIn -e 'ai-knowledge-base' -e 'kb-' -e '\.kbignore' README.md AGENTS.md PRD.md CONTRIBUTING.md docs` returns only intentional matches (e.g. the changelog history line).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
This task is documentation only — no source edits. It does not require the code
tasks to be complete because the target names are fully specified by the plan's
naming-conventions table. The Jekyll site builds with a configured
`baseurl`/site URL that must reflect the new repo slug.

## Input Dependencies
None. Zero-dependency Phase 1 task. (Reference the plan's naming-conventions
table for exact old→new mappings.)

## Output Artifacts
- Rebranded `README.md`, `AGENTS.md`, `PRD.md`, `CONTRIBUTING.md`.
- Updated Jekyll config and renamed `ana-navigation.md`.
- New `CHANGELOG.md` breaking-change entry with upgrade steps.

## Implementation Notes
This plan does **not** mandate blind substitution of every English occurrence
of "knowledge base" — only identifiers, paths, brand references, and
product-name usages.

<details>
<summary>Step-by-step</summary>

1. `README.md`: update package name, `npm i`/`npx` commands, any badges,
   `/kb-*` → `/ana-*` command examples, `.ai/knowledge-base/` → `.ai/analecta/`
   paths, and the docs site URL.
2. `AGENTS.md`: update the opening identity line, command examples, and the
   structure section (deployed hook filenames `ana-*`, `ana-hooks/` OpenCode
   dir, env-var names `ANALECTA_*`, skill names `ana-*`, `.anaignore`).
3. `PRD.md`: update product name and any `kb-*`/path references.
4. `CONTRIBUTING.md`: update maintainer commands and package name.
5. Jekyll docs under `docs/`: update `_config.yml` (or equivalent) `title`,
   `url`, and `baseurl` to the `analecta` repo slug; `git mv
   docs/internals/kb-navigation.md docs/internals/ana-navigation.md` and update
   any links/nav references pointing at the old filename; sweep doc bodies for
   brand/identifier/path references.
6. `CHANGELOG.md`: add a new top entry describing the breaking rename. Include
   the explicit consumer upgrade steps:
   - `git mv .ai/knowledge-base .ai/analecta` (or move the directory)
   - rename `.kbignore` → `.anaignore`
   - use `/ana-bootstrap`, `/ana-curate`, `/ana-add` instead of `/kb-*`
   - re-run `analecta init`
   Do not edit pre-existing changelog entries.
7. Rebrand the product noun ("an analecta" / "an analect") where the product is
   named; leave generic descriptive "knowledge base" prose intact where helpful.
8. Verify with the grep in the acceptance criteria.
</details>
