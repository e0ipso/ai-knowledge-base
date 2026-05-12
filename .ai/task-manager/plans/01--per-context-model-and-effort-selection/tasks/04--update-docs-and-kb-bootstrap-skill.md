---
id: 4
group: "docs"
dependencies: [1]
status: "completed"
created: 2026-05-12
skills:
  - docs
---
# Update docs, example config, and kb-bootstrap skill for new model keys

## Objective
Make the three new config keys discoverable and document the best-effort skill behavior. Update `docs/cli-reference.md`, the relevant internals architecture page, the committed example `config.yaml`, and the `/kb-bootstrap` skill markdown (both the source template and any copy under `templates/`) so the agent reads `bootstrapModel.name` and forwards it to its `Task`-tool sub-agent.

## Skills Required
- docs (markdown authoring)

## Acceptance Criteria
- [ ] `docs/cli-reference.md` contains a new subsection (e.g. "Model and effort selection") listing all three config keys (`stage2Model`, `curatorModel`, `bootstrapModel`), each with its `name` and `effort` sub-keys, accepted values (`name`: `haiku` / `sonnet` / `opus`; `effort`: `low` / `medium` / `high` / `xhigh` / `max`), and the rule that omitting a key omits the CLI flag entirely.
- [ ] The internals doc that describes the subprocess layout (`docs/internals/architecture.md` or the equivalent page; if none exists, `docs/internals/hooks.md` is the right place for the `stage2Model` half) names the three subprocess contexts and points at the config keys that govern each, plus one sentence on the best-effort skill behavior for `/kb-bootstrap`.
- [ ] `.ai/knowledge-base/config.yaml` (the committed example in this repo) shows commented-out sample lines for the three keys, each with `name` and `effort` sub-keys set to plausible values.
- [ ] `templates/claude/skills/kb-bootstrap/SKILL.md` (and any other shipped copy of the kb-bootstrap skill markdown) instructs the agent to read `bootstrapModel.name` from resolved settings and pass it as the `model` parameter to its `Task`-tool sub-agent. It explicitly notes that `bootstrapModel.effort` is ignored on this path because the `Task` tool exposes no `effort` parameter.
- [ ] No em-dashes, en-dashes, or ` - ` separators appear in any prose written by this task. Use commas, colons, or parentheses.
- [ ] No retrospective framing ("previously…", "in earlier versions…") in any doc written by this task.

## Technical Requirements
- Use the same heading depth and table style as surrounding sections in each file.
- For `cli-reference.md`, prefer one table that lists all six effective knobs (three keys, each with two sub-keys) over scattered prose.
- Do not write a CHANGELOG entry; semantic-release handles that.

## Input Dependencies
- Task 1 must be complete so the schema doc-comment and the docs agree on the exact key shape.

## Output Artifacts
- Updated `docs/cli-reference.md`.
- Updated internals doc (`docs/internals/architecture.md` or `docs/internals/hooks.md`, whichever is the established home for subprocess wiring).
- Updated `.ai/knowledge-base/config.yaml` example.
- Updated `templates/claude/skills/kb-bootstrap/SKILL.md` (and any duplicate copy).

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. `docs/cli-reference.md`:
   - Open the existing file and find where configuration keys are documented. Add a new subsection titled "Model and effort selection" (or similar phrasing that fits the surrounding tone).
   - Render the keys as a table with columns: Key, Sub-key, Accepted values, Effect. Example row groups:
     - `stage2Model` / `name` / `haiku, sonnet, opus` / Passed as `--model` on Stage-2 drain spawns.
     - `stage2Model` / `effort` / `low, medium, high, xhigh, max` / Passed as `--effort` on Stage-2 drain spawns.
     - (same shape for `curatorModel` and `bootstrapModel`).
   - End with a one-line rule: if a key is absent, neither flag is passed and the user's `claude` CLI default is used.
2. Internals doc:
   - Run `ls docs/internals/` to find the right home. If `architecture.md` exists, append a short paragraph there. If not, the Stage-2 wiring fits in `hooks.md` and the CLI wiring (curator, bootstrap-incremental) fits in whichever internals page documents those commands. One paragraph total, pointing at the three keys.
   - Add one sentence on the best-effort skill behavior: `/kb-bootstrap` reads `bootstrapModel.name` and forwards it to its `Task`-tool sub-agent; `effort` is not yet plumbable through the `Task` tool.
3. `.ai/knowledge-base/config.yaml`:
   - Add three commented-out blocks (`# stage2Model:` / `#   name: haiku` / `#   effort: low`, etc.). Use realistic example values: stage2 with haiku/low, curator with opus/max, bootstrap with sonnet/high (illustrative; the example is not normative).
4. `templates/claude/skills/kb-bootstrap/SKILL.md`:
   - Find the section that explains how the skill spawns its sub-agent via the `Task` tool. Insert an instruction: before calling `Task`, read `bootstrapModel.name` from the resolved settings (the skill already has access via the CLI helper or equivalent); if present, pass it as the `model` parameter. State explicitly that `bootstrapModel.effort` is ignored on this path because the `Task` tool currently has no `effort` parameter.
   - If a duplicate or templated copy of this skill exists elsewhere in the repo (search for `kb-bootstrap/SKILL.md` under `src/templates-source/` or similar), update both so the install copy matches.
5. Style discipline:
   - Re-read each diff and confirm no `—`, `–`, or ` - ` separators in the new prose. Use commas, colons, or parentheses.
   - Do not describe what the docs "used to say"; document the current shape only.

</details>
