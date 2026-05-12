---
id: 1
group: "prompt-revisions"
dependencies: []
status: "completed"
created: 2026-05-12
skills:
  - prompt-engineering
---
# Revise proposal-extract.md to enforce end-state framing and surface corrective signals

## Objective

Edit `src/templates-source/prompts/proposal-extract.md` so the extractor (a) rejects transition-narrative bodies for both practice and map candidates, (b) names imperative corrective phrasings as first-class practice triggers, (c) describes the `/self-review-apply <path>.xml` pattern with a variable XML filename, (d) gives concrete heuristics for task-specific scope plus a drop-over-low-confidence bias, and (e) carries one inline worked example of a self-review-apply turn yielding one keep and one drop.

## Skills Required

- prompt-engineering: revise an LLM instruction file for clarity, weave new policy into existing sections, and craft a worked example that demonstrates the keep/drop decision.

## Acceptance Criteria

- [ ] An end-state framing rule explicitly forbids transition-narrative bodies for both practice and map candidates, and instructs that only the resulting end-state claim is retained when a transition is present.
- [ ] A corrective-pattern subsection names trigger phrasings ("don't do X, do Y", "no, never use that approach", "stop doing Z", "use Y instead") as first-class practice candidates, gated on generalization beyond the current task.
- [ ] A self-review-apply subsection describes the pattern: a `[USER]:` `/self-review-apply <path>.xml` invocation (XML filename variable) followed by an `[AGENT]:` narration; the extractor judges generalizability per narrated change.
- [ ] Task-specific heuristics are listed concretely (one-off identifiers, single irrelevant file paths, scope markers like "in this PR", "in this branch", "in this commit", "for this file"), paired with a confidence-bias rule that prefers drop over a low-confidence emission.
- [ ] At least one inline worked example shows a self-review-apply turn yielding one kept practice candidate and one explicitly dropped task-specific comment with a visible drop reason. The example uses a non-`review.xml` filename to reinforce that the pattern is filename-agnostic.
- [ ] The ownership boundary is preserved: practice candidates come from `[USER]:` turns only; map candidates may come from either role.
- [ ] No em-dashes, en-dashes, or ` - ` separators are introduced into new prose. Matches inside transcript-style example bodies that quote user or agent content verbatim are acceptable; matches in new instructional prose are not.
- [ ] No retrospective framing ("previously", "we used to", "earlier this prompt did") is introduced.
- [ ] `Version:` header is left untouched (no version bump).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Target file: `src/templates-source/prompts/proposal-extract.md` (157 lines at start).
- Vocabulary to be shared with the curator prompt: "end-state", "transition narrative", "corrective pattern", "task-specific scope". Use these exact terms so reviewers can grep both files.
- Inline example must remain valid against `ProposalOutputSchema`. Model it on the existing GDPR/PII inline example: keep `supports_existing_node` and `contradicts_existing_node` set to `null`.

## Input Dependencies

None. The plan document and the existing `proposal-extract.md` are sufficient.

## Output Artifacts

- Updated `src/templates-source/prompts/proposal-extract.md` with the five new guidance concepts and one new inline worked example.

## Implementation Notes

<details>
<summary>Step-by-step implementation guidance</summary>

1. **Read the current file end-to-end** before editing. The two sections most affected are "What you are looking for" and "What you are NOT looking for" (or whatever the existing headings are called). Other sections (Ownership boundary, Inline example, Output schema) likely stay structurally the same.

2. **End-state framing rule.** Add a paragraph (in the "What you are looking for" section, near the top, or in a new subsection if one fits the existing structure) stating:
   - Every candidate body describes the project as it currently is. Practice bodies state the rule in present tense. Map bodies describe the entity as it now exists.
   - Transition narratives ("we used to do X, now do Y", "renamed F to G", "removed Z", "switched from A to B", "migrated…") are not valid bodies.
   - When a transition is present in the transcript, the extractor records only the resulting end-state claim (for example: "the config file is YAML") and discards the journey.
   - Map nodes are not emitted with bodies like "X was added" or "Y was renamed to Z"; they describe the entity as it now is.

3. **Corrective-pattern subsection.** In the "What you are looking for" section, add a subsection (the existing structure may already have subsections for triggers; match its style) titled something like "Imperative corrections in user turns". List the trigger phrasings verbatim:
   - "don't do X, do Y"
   - "no, never use that approach"
   - "stop doing Z"
   - "use Y instead"
   - Similar imperative reversals.
   State that these are first-class practice candidates when the corrected behavior generalizes beyond the current task. Cross-reference the task-specific filter (next subsection) for when to drop them.

4. **Self-review-apply subsection.** Still in "What you are looking for", add a subsection describing the pattern:
   - A `[USER]:` turn invokes `/self-review-apply <path>.xml`. The XML filename is variable (it is not always `review.xml`).
   - The following `[AGENT]:` turn narrates the changes applied in response to review comments parsed from the XML.
   - Each narrated change is a candidate corrective signal. The extractor judges generalizability per change. Apply the corrective-pattern rule and the task-specific filter to each.

5. **Task-specific filter.** Either in "What you are NOT looking for" or as a paragraph under the corrective-pattern subsection, list concrete heuristics:
   - References to one-off variable names, function names, or single irrelevant file paths.
   - Scope markers: "in this PR", "in this branch", "in this commit", "for this file".
   - Any wording that only makes sense for the current change.
   Then add the confidence-bias rule, phrased clearly: when a corrective signal does not generalize to a project-level rule, prefer dropping it over emitting a low-confidence practice candidate. Add the framing aid: "the rule's *scope*, not its *occasion*, decides task-specificity". A rule mentioned "in this PR" because that's where the violation was noticed may still be project-wide and should be kept; a rule that only constrains code touched in this PR is task-specific and should be dropped.

6. **Inline worked example.** Add a new inline example block (alongside or under the existing GDPR/PII example, in the same style). Structure:
   - A `[USER]:` line: `/self-review-apply feedback/round-2.xml` (or any non-`review.xml` filename).
   - An `[AGENT]:` narration block describing two applied review comments:
     - One that generalizes (for example: "renamed a single-letter loop variable; the review note was that loop variables in this codebase always use descriptive names").
     - One that is task-specific (for example: "fixed a typo in a docstring in a single file").
   - The expected output JSON shows:
     - One emitted practice candidate whose body states the generalizing rule in present tense (no "previously", no "we changed").
     - One explicitly dropped item with a `drop_reason` field naming the task-specific scope (or whatever field the existing schema uses to record drops; if no such field exists in `ProposalOutputSchema`, narrate the drop in the example's commentary text rather than in the JSON output). Check the existing example to mirror its shape exactly.
   - Keep `supports_existing_node` and `contradicts_existing_node` as `null` to match the existing example.

7. **Ownership boundary preservation.** Do not modify the existing rule that practice nodes come from `[USER]:` turns only and map nodes may come from either role. If the new subsections risk muddying that, add a one-line reminder.

8. **Prose conventions.** Re-read your edits for:
   - Em-dashes (`—`), en-dashes (`–`), or ` - ` separators: replace with commas, colons, or parentheses. The repo's MEMORY.md and the practice-no-em-dashes-or-hyphen-as-dash-in-prose KB node forbid these in prose.
   - Retrospective framing in instructional prose ("the prompt used to…", "previously…"): rewrite in present tense.
   - Backwards-compat language ("for now keep…", "legacy support for…"): remove.

9. **Do not bump `Version:`.** Leave the existing version header untouched.

10. **Verification (local).** Before finishing the task, run:
    ```
    grep -nE "end[- ]state|transition narrative|corrective|self-review-apply|task-specific|don't do" src/templates-source/prompts/proposal-extract.md
    grep -nE " - |—|–" src/templates-source/prompts/proposal-extract.md
    ```
    The first grep should show hits for all five concepts. The second should not show any hits in newly written instructional prose (hits inside transcript-quoted lines are acceptable).

</details>
