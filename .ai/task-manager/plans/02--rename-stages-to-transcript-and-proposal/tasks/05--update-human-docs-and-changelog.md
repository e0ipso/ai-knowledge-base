---
id: 5
group: "docs"
dependencies: []
status: "pending"
created: 2026-05-12
skills:
  - docs
---
# Update human-facing documentation, skills, and CHANGELOG

## Objective

Rewrite `PRD.md`, `IMPLEMENTATION.md`, `README.md`, the `docs/` tree (including `docs/internals/`), the `.claude/skills/kb-curate/SKILL.md` description, and add a single breaking-change entry to `CHANGELOG.md` so all human-readable documentation reflects the Transcript / Proposal vocabulary. The CHANGELOG entry is the *only* place that records the historical rename.

## Skills Required

`docs` — Markdown prose, technical writing, semantic-release CHANGELOG conventions.

## Acceptance Criteria

- [ ] `README.md`: the capture-pipeline pitch references "an async proposal extractor turns them into structured candidates" (or equivalent phrasing) — no `Stage 1`/`Stage 2`/`stage-2` text remains.
- [ ] `PRD.md`: every reference to "stage-2 extraction", "Stage 1", "Stage 2", "_logs/stage-2/", and the `stage_2_status: failed` frontmatter row in §11 is updated to Proposal vocabulary.
- [ ] `IMPLEMENTATION.md`:
   - §5.1 retitled "Transcript capture: deterministic, fast, blocking-safe".
   - §5.2 retitled "Proposal generation: async hook + headless `claude -p` subprocess".
   - §11.3 retitled to reference proposal generation.
   - §11.17 retitled to reference the pass-ownership boundary in proposal generation.
   - ASCII pipeline diagrams updated.
   - M1/M2 milestone descriptions updated.
   - Tree diagrams reference `kb-proposal-drain.mjs` and `_logs/proposal/`.
   - All `stage_2_*` frontmatter samples renamed.
- [ ] `docs/internals/architecture.md`, `docs/internals/hooks.md`, `docs/internals/schemas.md`, `docs/internals/manual-test-plan.md`, `docs/internals/index.md`, `docs/cli-reference.md`: every offending reference renamed in place.
- [ ] `.claude/skills/kb-curate/SKILL.md`: `stage_2_status: done` (and any similar reference) updated to `proposal_status: done`.
- [ ] `CHANGELOG.md` has a new breaking-change entry under the upcoming release listing the renamed frontmatter keys, settings keys, hook filename, prompt filename, log subdir, and the `schema_version` bump to 2, plus instruction to delete `_sessions/` and `_logs/stage-2/` on upgrade.
- [ ] No retrospective framing in PRD, IMPLEMENTATION, README, docs/, or SKILL.md ("previously called Stage 2" is forbidden outside CHANGELOG.md).
- [ ] No em-dashes or hyphen-as-dash separators introduced anywhere.
- [ ] `grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" PRD.md IMPLEMENTATION.md README.md docs/ .claude/skills/kb-curate/SKILL.md` returns zero hits. (CHANGELOG.md is excluded — historical entries there can keep the old names if they refer to releases that shipped them.)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Plain Markdown.
- CHANGELOG follows `semantic-release` / Conventional Commits conventions. The next release section is generated from commit messages, but adding an explicit "BREAKING CHANGES" subsection under the upcoming version is idiomatic for this repo — match what's already there. If the repo uses semantic-release with `@semantic-release/changelog`, only the upcoming-release section needs a manual entry (semantic-release fills the rest).

## Input Dependencies

None at the file-edit level — doc prose is independent of source code edits.

## Output Artifacts

- Updated `PRD.md`, `IMPLEMENTATION.md`, `README.md`.
- Updated `docs/` tree.
- Updated `.claude/skills/kb-curate/SKILL.md`.
- New CHANGELOG entry.

## Implementation Notes

<details>
<summary>Detailed step-by-step</summary>

1. Survey:
   ```bash
   grep -rln "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" \
     PRD.md IMPLEMENTATION.md README.md docs/ .claude/skills/
   ```

2. Walk each file and apply the rename dictionary. Headings, body prose, code samples, tree diagrams, ASCII art, frontmatter examples — everything flips. Be especially careful with:
   - ASCII pipeline diagrams in `IMPLEMENTATION.md` and `docs/internals/architecture.md` — box labels need updating without breaking alignment.
   - Tree diagrams that list `.claude/hooks/kb-stage2-drain.mjs` → `kb-proposal-drain.mjs`, and `_logs/stage-2/` → `_logs/proposal/`.
   - Frontmatter samples showing `stage_2_status: pending` etc. → `proposal_status: pending`.
   - Settings-file samples showing `stage2Timeout` / `stage2Model` → `proposalTimeout` / `proposalModel`.

3. Update `.claude/skills/kb-curate/SKILL.md`: change `stage_2_status: done` (and any related strings) to `proposal_status: done`.

4. Add a CHANGELOG entry. The shape (look at existing CHANGELOG.md for the exact heading style and pick the closest match):
   ```markdown
   ## [Unreleased]

   ### BREAKING CHANGES

   * Renamed the two-step capture pipeline to Transcript / Proposal across code, configuration, frontmatter, prompts, file paths, and docs. Schema version bumps from 1 to 2.
     - Frontmatter keys on session logs: `stage_2_status` → `proposal_status`, `stage_2_completed_at` → `proposal_completed_at`, `stage_2_error` → `proposal_error`, `stage_2_log` → `proposal_log`.
     - Settings keys: `stage2Timeout` → `proposalTimeout`, `stage2Model` → `proposalModel`.
     - Bundled hook: `.claude/hooks/kb-stage2-drain.mjs` → `.claude/hooks/kb-proposal-drain.mjs`.
     - Prompt template: `prompts/stage-2-extract.md` → `prompts/proposal-extract.md`.
     - Log subdirectory: `_logs/stage-2/` → `_logs/proposal/`.
     - Session-log section headings: `## Stage 1: redacted transcript slice` → `## Transcript`; `## Stage 2: structured summary` → `## Proposal`.
     - `schema_version` on session logs, settings, queue, dedup-cache, and bootstrap-state files bumps from 1 to 2.
     - On upgrade: delete `.ai/knowledge-base/_sessions/` and `.ai/knowledge-base/_logs/stage-2/` (both are gitignored and reproducible from future sessions).
   ```
   If the repo's CHANGELOG is fully managed by semantic-release and has no manual `## [Unreleased]` section, instead add a *placeholder* near the top in whatever style matches the file. If the file consists only of semantic-release-generated entries, the BREAKING CHANGE footer in the conventional commit will produce the changelog automatically — in that case, do not add a manual entry, and note this in the PR description instead.

5. Verify:
   ```bash
   grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" \
     PRD.md IMPLEMENTATION.md README.md docs/ .claude/skills/kb-curate/SKILL.md
   ```
   Expect zero output. Historical CHANGELOG entries that reference shipped versions which used the old names are allowed to keep their original text — the grep deliberately excludes `CHANGELOG.md`.

Coordination notes:
- Do NOT touch `src/`, `tests/`, `templates/`, `src/templates-source/`, `nodes/`, `.ai/knowledge-base/INDEX.md`, `.ai/knowledge-base/GRAPH.md`, `tsup.config.ts`, `.ai/knowledge-base/config.yaml`, `.claude/settings.json`, or `.claude/hooks/` — those belong to sibling tasks.
- No em-dashes (`—`, `–`, or ` - ` as separator) and no retrospective framing outside `CHANGELOG.md`.

</details>
