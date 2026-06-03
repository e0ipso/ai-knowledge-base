---
id: 2
group: "prompts"
dependencies: []
status: "completed"
created: 2026-05-12
skills:
  - prompts
---
# Rename `stage-2-extract.md` to `proposal-extract.md` and bump prompt Version comments

## Objective

Rename the prompt template file in both `src/templates-source/prompts/` and `templates/prompts/`, retitle and rewrite the body to use Proposal vocabulary, and bump the `Version: N` comment in every prompt that changes behavior (per `practice-prompt-versioning.md`). Update `docs/internals/prompts.md` with one-line changelog notes for each bumped prompt.

## Skills Required

`prompts` — prompt-template authoring, version-comment hygiene.

## Acceptance Criteria

- [ ] `src/templates-source/prompts/stage-2-extract.md` is moved to `src/templates-source/prompts/proposal-extract.md`.
- [ ] `templates/prompts/stage-2-extract.md` is moved to `templates/prompts/proposal-extract.md`.
- [ ] Both renamed files: header retitled "Proposal Extraction Prompt"; `Version: N` comment bumped by one; `Used by:` line points to `kb-proposal-drain.mjs`; every body reference to "stage-2", "stage 2", "Stage 2" is replaced with the Proposal vocabulary.
- [ ] `src/templates-source/prompts/curator.md` and `templates/prompts/curator.md`: bump `Version`; rewrite "stage-2 outputs" and any analogous phrasing to "proposal outputs".
- [ ] `src/templates-source/prompts/bootstrap-incremental.md` and `templates/prompts/bootstrap-incremental.md`: bump `Version`; rewrite stage-2 references.
- [ ] `docs/internals/prompts.md` records a one-line changelog note for each bumped prompt (no retrospective framing — current state only; the version bump and rename are the note).
- [ ] `grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" src/templates-source/ templates/` returns zero hits.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Prompt files are plain Markdown with a leading HTML comment block carrying `Version: N` and `Used by: <hook-filename>` metadata.
- `src/templates-source/prompts/` is the editorial source; `templates/prompts/` is the published copy in the npm package. Both must move and match.
- The resolver in renamed `src/hooks/kb-proposal-drain.ts` and in `src/commands/doctor.ts` reads the file by basename `proposal-extract.md` (sibling task 1 wires this).

## Input Dependencies

None — the rename dictionary is in the plan document.

## Output Artifacts

- Renamed prompt files in both directories.
- Bumped `Version` comments and updated body prose in all three prompts (`proposal-extract.md`, `curator.md`, `bootstrap-incremental.md`).
- `docs/internals/prompts.md` updated with version-bump notes.

## Implementation Notes

<details>
<summary>Detailed step-by-step</summary>

1. Find the current `Version: N` in each prompt:
   ```bash
   grep -n "Version:" src/templates-source/prompts/*.md templates/prompts/*.md
   ```
2. `git mv src/templates-source/prompts/stage-2-extract.md src/templates-source/prompts/proposal-extract.md`.
3. `git mv templates/prompts/stage-2-extract.md templates/prompts/proposal-extract.md`.
4. In both renamed files:
   - Retitle the top-level heading from "Stage-2 Extraction Prompt" (or equivalent) to "Proposal Extraction Prompt".
   - Bump the `Version: N` comment to `Version: N+1`.
   - Replace the `Used by:` reference from `kb-stage2-drain.mjs` to `kb-proposal-drain.mjs`.
   - Sweep body prose: "stage-2" → "proposal", "stage 2 output" → "proposal output", any "Stage 2" → "Proposal". Section headings the prompt asks the model to produce (`## Stage 1` / `## Stage 2` in the *input* schema description) update to `## Transcript` / `## Proposal`.
5. Repeat steps 1, 4 (without rename) for `curator.md` and `bootstrap-incremental.md` in both directories. The `Used by:` references should already be unchanged; only body prose and the Version comment change.
6. Open `docs/internals/prompts.md` and add a one-line note per bumped prompt indicating the new version number and the rename. Describe the current design only — no "previously called" framing. Example: `proposal-extract.md (vN+1): drives the async proposal-drain hook to convert a redacted transcript into structured candidates`.
7. Verify:
   ```bash
   grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" src/templates-source/ templates/
   ```
   Expect zero output.

Coordination notes:
- Do NOT edit `src/`, `tests/`, `nodes/`, or other docs files — those belong to sibling tasks.
- No em-dashes; no retrospective framing.

</details>
