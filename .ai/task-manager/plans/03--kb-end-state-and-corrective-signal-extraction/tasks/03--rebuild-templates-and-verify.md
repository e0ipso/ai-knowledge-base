---
id: 3
group: "build-and-verify"
dependencies: [1, 2]
status: "pending"
created: 2026-05-12
skills:
  - bash
  - build-tooling
---
# Rebuild shipped templates and verify the artifact matches the prompt sources

## Objective

Regenerate `templates/prompts/proposal-extract.md` and `templates/prompts/curator.md` from `src/templates-source/prompts/` by running `npm run build:templates`, then verify the shipped artifact reflects the source edits verbatim and that the self-validation grep checks from the plan all pass.

## Skills Required

- bash: run npm scripts and chain grep/diff verifications.
- build-tooling: understand that `scripts/build-templates.mjs` regenerates `templates/` from sources and that `templates/` is the shipped npm artifact.

## Acceptance Criteria

- [ ] `npm run build:templates` runs to completion with exit code 0.
- [ ] After the build, `git diff --stat templates/prompts/proposal-extract.md templates/prompts/curator.md` shows both shipped files updated.
- [ ] `diff src/templates-source/prompts/proposal-extract.md templates/prompts/proposal-extract.md` shows no content drift (the files are identical, or differ only in build-injected boilerplate that the build script always adds).
- [ ] `diff src/templates-source/prompts/curator.md templates/prompts/curator.md` shows the same: no content drift beyond any build-injected boilerplate.
- [ ] The extractor-prompt grep passes: `grep -nE "end[- ]state|transition narrative|corrective|self-review-apply|task-specific|don't do" src/templates-source/prompts/proposal-extract.md` shows hits for all five concepts.
- [ ] The curator-prompt grep passes: `grep -nE "change-oriented|end[- ]state|previously|supersedes" src/templates-source/prompts/curator.md` shows hits for the change-oriented drop reason, the refinement rewrite rule, and the supersession-in-frontmatter clarification.
- [ ] The em-dash / hyphen-as-dash check on new prose passes: `grep -nE " - |—|–" src/templates-source/prompts/proposal-extract.md src/templates-source/prompts/curator.md` shows no offending separators in newly written instructional prose (matches inside transcript-style example bodies that quote user or agent content verbatim are acceptable).
- [ ] The inline self-review-apply example in `proposal-extract.md` is present, uses a non-`review.xml` filename, contains both `[USER]:` and `[AGENT]:` lines, and shows one kept practice candidate and one explicitly dropped task-specific comment with the drop reason visible.
- [ ] No files outside `templates/` are modified by `npm run build:templates` (the build script's output is confined to the templates artifact).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Build entry point: `npm run build:templates` (which runs `scripts/build-templates.mjs`).
- Artifact directory: `templates/prompts/`.
- Source directory: `src/templates-source/prompts/`.
- Repo convention: bundled/generated output (`.claude/hooks/*.mjs`, etc.) is gitignored, but `templates/` is the shipped npm artifact and IS tracked. Updating it via the build script is the expected path.

## Input Dependencies

- Task 1: `src/templates-source/prompts/proposal-extract.md` revised.
- Task 2: `src/templates-source/prompts/curator.md` revised (and `docs/internals/prompts.md` bullet added).

## Output Artifacts

- Regenerated `templates/prompts/proposal-extract.md` and `templates/prompts/curator.md` reflecting the source edits.
- A verification report (terminal output captured in the task's final message) showing the four greps and the two diffs.

## Implementation Notes

<details>
<summary>Step-by-step verification procedure</summary>

1. **Confirm pre-state.** From the repo root, run `git status` and confirm that `src/templates-source/prompts/proposal-extract.md`, `src/templates-source/prompts/curator.md`, and `docs/internals/prompts.md` show as modified (from tasks 1 and 2), and that `templates/prompts/*.md` are unmodified at this point.

2. **Run the build.** Execute:
   ```
   npm run build:templates
   ```
   Verify exit code 0. Read the script's output for any warnings about source files it did not find or unexpected behavior.

3. **Confirm artifact update.** Run:
   ```
   git diff --stat templates/prompts/proposal-extract.md templates/prompts/curator.md
   ```
   Both files should show non-zero line changes.

4. **Confirm no content drift between source and artifact.** Run:
   ```
   diff src/templates-source/prompts/proposal-extract.md templates/prompts/proposal-extract.md
   diff src/templates-source/prompts/curator.md templates/prompts/curator.md
   ```
   The diffs should be empty, or differ only in stable build-injected boilerplate (for example, a generated header that the build script always adds; check the existing pre-task state of the artifact to know what to expect). If unexpected content differences appear, investigate `scripts/build-templates.mjs` before declaring the task complete.

5. **Run the self-validation greps from the plan.**
   ```
   grep -nE "end[- ]state|transition narrative|corrective|self-review-apply|task-specific|don't do" src/templates-source/prompts/proposal-extract.md
   grep -nE "change-oriented|end[- ]state|previously|supersedes" src/templates-source/prompts/curator.md
   grep -nE " - |—|–" src/templates-source/prompts/proposal-extract.md src/templates-source/prompts/curator.md
   ```
   The first two should show hits for every concept listed in the plan's primary success criteria. The third should show no hits in newly written instructional prose; if it shows hits, inspect each and decide whether the hit is inside a transcript-style example block (acceptable) or in new prose (not acceptable, return to task 1 or task 2 to fix).

6. **Inspect the inline self-review-apply example by reading.** Open `src/templates-source/prompts/proposal-extract.md` and locate the new inline example block. Confirm by reading:
   - The `[USER]:` line invokes `/self-review-apply` with a filename that is not `review.xml`.
   - The `[AGENT]:` narration describes two applied review comments.
   - The expected output JSON shows one kept practice candidate and one explicitly dropped task-specific comment with a visible drop reason.
   - `supports_existing_node` and `contradicts_existing_node` are `null`, matching the existing GDPR/PII example.

7. **Confirm scope of build output.** Run `git status` again and confirm the only files touched by the build are inside `templates/prompts/`. If `scripts/build-templates.mjs` rewrote anything else, flag it for the reviewer; do not commit broader changes silently.

8. **Do not run an end-to-end curate fixture in this task.** The plan lists that as optional self-validation; it is not part of acceptance criteria here.

9. **Do not bump prompt `Version:` headers** in the artifact. If the build script copies them verbatim from source, this should be automatic; if you see a Version change in the artifact diff that you did not introduce in source, investigate.

</details>
