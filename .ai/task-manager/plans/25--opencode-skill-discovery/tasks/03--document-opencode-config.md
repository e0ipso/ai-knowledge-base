---
id: 3
group: "opencode-installer"
dependencies: [1]
status: "pending"
created: "2026-05-19"
skills: ["documentation"]
---
# Document `.opencode/opencode.json` as an installer-managed config file

## Objective
Update `docs/installation.md` so users understand that `.opencode/opencode.json` is created by the installer to register the local skills directory, and that it is safe to keep under version control.

## Skills Required
- `documentation`: Technical writing aligned with existing installation guide tone and structure

## Acceptance Criteria
- [ ] The OpenCode CLI section in `docs/installation.md` mentions `.opencode/opencode.json` as an installer-managed file that registers `.opencode/skills/` for OpenCode discovery.
- [ ] The wording clarifies that the file should not be manually deleted if the user wants skills to remain invokable.
- [ ] No other sections are modified unnecessarily.

## Technical Requirements
- The docs use Jekyll frontmatter (`---` block at top). Do not alter the frontmatter.
- Insert the new bullet under the existing "This creates / updates:" list in the OpenCode CLI section.
- Keep the tone consistent with the rest of the document (concise, factual).

## Input Dependencies
- Task 1 implementation (understanding the exact behavior being documented)

## Output Artifacts
- Modified `docs/installation.md`

## Implementation Notes
<details>
In the OpenCode CLI section, after the existing bullet about `.opencode/skills/`, add a sentence or bullet like:

> `.opencode/opencode.json`: a project-level config file written by the installer that registers `.opencode/skills/` in OpenCode's `skills.paths`. Do not delete it if you want the installed skills to remain discoverable.

Or, if adding to the bullet list:

> `.opencode/opencode.json`: registers the local skills directory so OpenCode can discover them. Safe to commit.

The exact phrasing should match the existing style of the other bullet points (short, declarative).
</details>
