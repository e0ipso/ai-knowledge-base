---
id: 2
group: "prompt-revisions"
dependencies: []
status: "pending"
created: 2026-05-12
skills:
  - prompt-engineering
  - documentation
---
# Revise curator.md to backstop end-state framing, and mirror the new drop reason in docs/internals/prompts.md

## Objective

Edit `src/templates-source/prompts/curator.md` so the curator (a) drops change-oriented candidates as an automatic reason regardless of confidence, (b) rewrites refined node bodies as present-tense end-state descriptions without "previously…" or "earlier this used to…" paragraphs, and (c) records supersession exclusively in `supersedes` / `superseded_by` frontmatter, never in body prose. Then mirror the new drop reason in the curator's "Anti-patterns" subsection of `docs/internals/prompts.md` with a single bullet so prose and prompt stay aligned.

## Skills Required

- prompt-engineering: extend the curator's four-action policy (add / modify / contradict / drop) with new guidance without changing its structure, schema, or actions.
- documentation: add one short bullet to `docs/internals/prompts.md` so the curator anti-patterns documented there match the prompt.

## Acceptance Criteria

- [ ] The **drop** action's reason list in `curator.md` includes change-oriented framing (transition narratives, migration stories, rename or removal logs) as an automatic drop trigger, even when confidence is high. The text states explicitly that a high-confidence changelog entry is still a changelog entry.
- [ ] When a candidate's only retainable content is its end-state claim, the curator extracts that claim; otherwise the whole candidate is dropped.
- [ ] The **modify** action's guidance contains an end-state-rewrite rule: a merged body reads as the current state in present tense, and the curator never appends "previously…" or "earlier this used to…" paragraphs.
- [ ] The **contradict** action's guidance states that supersession is a state replacement, not a history record: the new node body describes only the new end state; the supersession relationship lives in the `supersedes` / `superseded_by` frontmatter fields, not in body prose.
- [ ] No new actions, no new schema fields, no new top-level sections are introduced. The four-action structure is preserved.
- [ ] Shared vocabulary used in `proposal-extract.md` ("end-state", "transition narrative", "corrective pattern", "task-specific scope") appears in `curator.md` where relevant so reviewers can grep both files.
- [ ] No em-dashes, en-dashes, or ` - ` separators are introduced in new prose. No retrospective framing in instructional prose. No backwards-compat language.
- [ ] `Version:` header is left untouched (no version bump).
- [ ] `docs/internals/prompts.md`, in the "Anti-patterns" subsection under the Curator prompt section, gains one short bullet naming change-oriented framing as an automatic drop reason. No other edits to `docs/internals/prompts.md` are made (no version-table edit, no structural changes).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Target prompt file: `src/templates-source/prompts/curator.md` (148 lines at start).
- Target docs file: `docs/internals/prompts.md`, "Anti-patterns" subsection under the Curator prompt section.
- Shared keywords with the extractor prompt: "end-state", "transition narrative", "change-oriented framing", "supersedes", "superseded_by".
- Curator schema and action set are unchanged; only the prose inside existing action blocks is extended.

## Input Dependencies

None. The plan document, the existing `curator.md`, and `docs/internals/prompts.md` are sufficient.

## Output Artifacts

- Updated `src/templates-source/prompts/curator.md` with the change-oriented automatic drop, the end-state-rewrite rule for modify, and the supersession-in-frontmatter clarification for contradict.
- Updated `docs/internals/prompts.md` with one new bullet under the curator "Anti-patterns" subsection.

## Implementation Notes

<details>
<summary>Step-by-step implementation guidance</summary>

1. **Read both target files end-to-end** before editing. Identify the four action blocks in `curator.md` (add / modify / contradict / drop) and the "Anti-patterns" subsection under the Curator prompt section in `docs/internals/prompts.md`.

2. **Drop action: add change-oriented framing as an automatic reason.** In the curator's drop action block (or wherever drop reasons are enumerated):
   - Append change-oriented framing as a new bullet alongside the existing drop reasons (rephrasing, low-confidence vagueness, general programming knowledge, internal inconsistency).
   - Make it explicit that this trigger is automatic regardless of confidence: a high-confidence changelog entry is still a changelog entry; confidence alone does not earn it a node.
   - State the salvage rule: when the candidate contains a clean end-state claim alongside the change-oriented framing, the curator may extract and keep that claim; when there is no clean end-state claim, the whole candidate is dropped.
   - Use the shared vocabulary: "transition narrative", "change-oriented framing", "end-state claim".

3. **Modify action: add the end-state-rewrite rule.** In the curator's modify action block:
   - Add a paragraph stating that when refining an existing node, the merged body must read as the current state in present tense.
   - State the prohibition clearly: never append "previously…" or "earlier this used to…" paragraphs; never narrate "the project moved from X to Y" inside the body.
   - When the new candidate's information is a transition, the curator rewrites the existing node body so that only the new end state remains visible; the prior state is gone from the body.

4. **Contradict action: clarify supersession is state replacement.** In the curator's contradict action block:
   - Reinforce that supersession is a state replacement, not a history record.
   - The new node body describes only the new end state, in present tense.
   - The supersession relationship is recorded in the `supersedes` and `superseded_by` frontmatter fields of the relevant nodes; the body does not narrate the supersession ("this replaces…", "previously the rule was…").

5. **Structural constraints.** Do not add new top-level sections, new action types, or new schema fields. The four-action structure (add / modify / contradict / drop) stays. The curator's input/output contract stays.

6. **Shared vocabulary.** Search the file for "end-state" and the other shared terms; add them where they reinforce the policy (especially in the drop and modify blocks). The goal is that a reviewer running the same grep across `proposal-extract.md` and `curator.md` finds the same terminology.

7. **Prose conventions.** Re-read your edits for:
   - Em-dashes (`—`), en-dashes (`–`), or ` - ` separators: replace with commas, colons, or parentheses.
   - Retrospective framing in instructional prose ("the curator used to…"): rewrite in present tense.
   - Backwards-compat language: remove.

8. **Do not bump `Version:`.** Leave the existing version header untouched.

9. **Mirror the new drop reason in `docs/internals/prompts.md`.** Open `docs/internals/prompts.md`, find the "Anti-patterns" subsection under the Curator prompt section, and add one short bullet that names change-oriented framing (transition narratives, migration stories, rename or removal logs) as an automatic drop reason. Match the tone and length of the existing bullets in that list.
   - Do not edit the "Prompt versions" table (no version bump is being made; the docs table stays as-is).
   - Do not edit other sections of `docs/internals/prompts.md`.

10. **Verification (local).** Before finishing the task, run:
    ```
    grep -nE "change-oriented|end[- ]state|previously|supersedes|superseded_by" src/templates-source/prompts/curator.md
    grep -nE " - |—|–" src/templates-source/prompts/curator.md
    grep -nE "change-oriented|end[- ]state" docs/internals/prompts.md
    ```
    The first grep should show hits for all four concepts. The second should show no new hits in newly written instructional prose. The third should show at least one hit for the new docs bullet.

</details>
