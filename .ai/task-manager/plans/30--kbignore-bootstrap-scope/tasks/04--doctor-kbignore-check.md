---
id: 4
group: "doctor"
dependencies: []
status: "completed"
created: "2026-05-22"
skills:
  - typescript
---
# Add `doctor` check for `.kbignore` presence and non-emptiness

## Objective

Make the load-bearing nature of `.kbignore` visible in the standard verification command. Warn (not error) when `.kbignore` is missing or contains only comments/whitespace, pointing the user at `init --upgrade`.

## Skills Required

- typescript

## Acceptance Criteria

- [ ] `src/commands/doctor.ts` adds a check that reads `<repoRoot>/.kbignore` and:
  - Passes if the file exists and contains at least one line that is non-blank and does not start with `#` (after `trimStart`).
  - Warns (severity must match existing advisory doctor checks — confirm by inspecting current `doctor.ts` output conventions before assigning a level) otherwise. Message text: `.kbignore missing or empty. Run \`init --upgrade\` to regenerate the default stub, or add your own patterns.`
- [ ] The check is non-fatal: doctor still exits per its existing aggregate logic and other checks are unaffected.
- [ ] `tests/commands/doctor.test.ts` (new or extended) covers four cases: missing file → warn; file with only comments and blank lines → warn; file with at least one pattern line → pass; file with leading whitespace then a `#` (comment) → still treated as a comment → warn if it is the only line.
- [ ] `npm run build` and `npm test` pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `src/commands/doctor.ts` (study existing checks for severity-level conventions before adding the new one).
- `tests/commands/doctor.test.ts`.
- Node `fs` for the read; no new dependency.

## Input Dependencies

None — the check is independent of Tasks 1/2/3 (it just inspects a file path).

## Output Artifacts

- A doctor check that catches the load-bearing-setup case the plan describes in Component 5.

## Implementation Notes

<details>
<summary>Guidance</summary>

- The "non-empty after comment strip" rule means: read the file, split on newlines, keep lines where `trimmed.length > 0 && !trimmed.startsWith('#')` — pass if any remain.
- Read errors other than `ENOENT` (e.g. permission denied) should surface as a separate error-severity check, not silently treated as "missing". Look at how other doctor checks differentiate missing vs broken before deciding.
- The warning message wording is specified verbatim — match it including the backticks around `init --upgrade`.
- Do not couple this task to the Task 1 stub generator — doctor must not invoke `renderKbignoreStub`. It only checks existence and non-emptiness.
- If `doctor.ts` groups checks by category (filesystem / config / etc.), file the new check next to similar config-presence checks.

</details>
