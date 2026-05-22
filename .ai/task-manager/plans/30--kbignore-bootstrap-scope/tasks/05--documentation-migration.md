---
id: 5
group: "documentation"
dependencies: [1, 2, 3, 4]
status: "pending"
created: "2026-05-22"
skills:
  - documentation
---
# Documentation: README quickstart + migration table, AGENTS.md parity, CHANGELOG BREAKING entry

## Objective

Land the migration story so a user reading only README + CHANGELOG can rewrite their old `--from/--include/--exclude` invocations into `.kbignore` patterns. Update AGENTS.md to match.

## Skills Required

- documentation

## Acceptance Criteria

- [ ] `README.md` quickstart: the `bootstrap-incremental --from … --include … --exclude …` example is replaced with a two-step flow (`init`, then `bootstrap-incremental`). One short paragraph explains `.kbignore` (purpose, gitignore-style syntax, where it lives) and links to the gitignore spec for full syntax.
- [ ] `README.md` includes a CI callout showing `bootstrap-incremental --yes` (the non-TTY abort message tells users to add it; the docs preempt the friction).
- [ ] `README.md` includes a migration table with at least these three rows:
  - `--exclude 'build/**'` → put `build/` in `.kbignore`.
  - `--include 'docs/**'` → put `*` then `!docs/` then `!docs/**` in `.kbignore` (note that the parent-directory caveat means un-ignoring `!docs/AGENTS.md` directly under `*` will NOT work without first un-ignoring the directory).
  - `--from ./docs` → no direct replacement; the walk root is always the repo root. Use `*` then `!docs/` then `!docs/**` to limit scope to a subtree.
- [ ] `AGENTS.md` (root): any mention of `--from`, `--include`, `--exclude` is removed; quickstart mirrors README.
- [ ] `CHANGELOG.md`: a `BREAKING` entry under the next major release covering:
  - Removed: `--from`, `--include`, `--exclude` flags on `bootstrap-incremental`.
  - Removed: `harnessInstructionSkipPatterns` auto-injection (now in default `.kbignore`).
  - Added: `.kbignore` (repo-root scope file, gitignore syntax).
  - Added: `init` generates a `.kbignore` stub; `init --upgrade` emits it when missing.
  - Added: interactive `--yes` confirmation gate on `bootstrap-incremental` (non-TTY without `--yes` aborts).
  - Added: `doctor` warns when `.kbignore` is missing or empty.
  - Note: harness memory ingestion (e.g. `CLAUDE.md`) is UNCHANGED — it bypasses `.kbignore`.
  - Migration: run `npx <package> init --upgrade` to generate `.kbignore`, then rewrite old flags using the README table.
- [ ] Cross-link the README migration section from the CHANGELOG entry.
- [ ] No documentation file references `--from`, `--include`, `--exclude`, or `harnessInstructionSkipPatterns` after this change. (`grep -RE -- '--from|--include|--exclude' README.md AGENTS.md` should only match if quoting historical syntax inside a migration row.)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `README.md`
- `AGENTS.md`
- `CHANGELOG.md`
- A regenerated `.kbignore` to copy snippets from (run `init` locally after Tasks 1-4 land, paste the stub header into README for the explanation paragraph if useful — but do not duplicate the full stub).

## Input Dependencies

- Task 1: stub format finalized so the explanation paragraph matches reality.
- Task 2: confirmation that `harnessInstructionSkipPatterns` is gone.
- Task 3: final CLI surface (`--yes`, `--dry-run`, no old flags).
- Task 4: doctor wording finalized.

## Output Artifacts

- Updated `README.md`, `AGENTS.md`, `CHANGELOG.md`.

## Implementation Notes

<details>
<summary>Guidance</summary>

- The migration table is the most-load-bearing piece of this task. A user with an old CI script must be able to rewrite it in under five minutes using only the table. Test it yourself by picking an arbitrary `--include` invocation and rewriting it via the table — if you stumble, the table needs more examples.
- The `--include 'docs/**'` → `*` then `!docs/` then `!docs/**` translation MUST acknowledge the parent-directory caveat. Do not give an example that demonstrates the bug.
- CI callout placement: put it near the quickstart `bootstrap-incremental` example, not buried in a separate section. Friction-with-CI is the most likely first complaint post-cutover.
- CHANGELOG style: match the existing CHANGELOG's formatting conventions (look at recent entries) — section ordering, header level, prefix tokens.
- Do NOT speculatively add a `practice/` KB node. The plan explicitly defers that decision to implementation discretion; default is to skip per YAGNI.
- AGENTS.md may have multiple references — grep for `--from`, `--include`, `--exclude`, `bootstrap-incremental` and audit each hit.
- Do not document internal symbols (`harnessInstructionSkipPatterns`, `discoverMarkdownFiles`) in user-facing docs. They belong in CHANGELOG only because removing them is itself a behavior change anyone embedding the lib should know about.

</details>
