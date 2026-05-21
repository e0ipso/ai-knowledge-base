---
id: 4
group: "documentation"
dependencies: []
status: "completed"
created: 2026-05-21
skills:
  - technical-writing
---
# Add troubleshooting paragraph for the hook-errors log file

## Objective
Make the new `<kb-root>/_logs/hook-errors-YYYY-MM-DD.log` file discoverable to someone whose hook "isn't doing anything", without expanding the docs surface beyond what the AC requires. One short paragraph in `docs/troubleshooting.md`.

## Skills Required
- `technical-writing` — single short paragraph that fits the existing voice of the page.

## Acceptance Criteria
- [ ] `docs/troubleshooting.md` contains a new paragraph that:
  - References the file path `<kb-root>/_logs/hook-errors-YYYY-MM-DD.log`.
  - Mentions the symptom "hook silently doing nothing" (or close paraphrase).
  - Explains that each line is a JSON object recording one swallowed parse failure or uncaught throw, with the hook name, phase, and error message.
- [ ] No new top-level heading is added unless `docs/troubleshooting.md` already organizes content under a "hooks" or symptom-based heading where this naturally fits.
- [ ] No architectural explanation of the diagnostic design (that lives in the issue / plan, not the user-facing docs).
- [ ] No changes to `README.md`, the docs-site lede, or `AGENTS.md`.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Plain markdown edit. Match the existing tone and formatting conventions of `docs/troubleshooting.md` (read the file first to see whether it uses headings per symptom, fenced code blocks for paths, etc.).

## Input Dependencies
None — this can run independently of the code changes. (The doc describes a file that will exist after Tasks 1 + 2 ship, but the docs change itself does not depend on them.)

## Output Artifacts
- Modified `docs/troubleshooting.md`.

## Implementation Notes

<details>
<summary>Detailed guidance</summary>

**Read the existing file first.** Open `docs/troubleshooting.md` and look at the structure. If it has a "Hooks" or "Silent hook" section, append the paragraph there. If it is organized by symptom, find the closest fit. If it has no clear structure, place the paragraph somewhere near the top where it's discoverable to a reader skimming for "my hook isn't doing anything".

**Suggested wording (adapt to fit the page's voice — do not paste verbatim if the page uses a different register):**

> **Hook seems to be silently doing nothing?** Check `<kb-root>/_logs/hook-errors-YYYY-MM-DD.log` for the most recent day. Each line is a JSON object recording one swallowed hook failure — either a parse error (the harness sent malformed JSON) or an uncaught throw inside the hook — with the hook name, phase, and error message. The file is dated; rotation is implicit. Hooks always exit 0 by design, so this log is the primary breadcrumb when a hook appears to do nothing.

**Format conventions to verify against the file:**
- Fenced backticks around file paths? Inline backticks?
- Hard line wrap (80 / 100 cols) or soft-wrap?
- Heading style (ATX `#` vs setext)?

**Do NOT:**
- Add a "Why does this exist?" explanation — leave the rationale in plan 28 / issue #33.
- Document the JSON schema beyond "hook name, phase, and error message".
- Add troubleshooting steps that require user action beyond reading the file.
- Link out to the issue tracker (the docs are user-facing; PR/issue history belongs in git).

</details>
