---
id: 4
group: "kb"
dependencies: []
status: "pending"
created: 2026-05-12
skills:
  - docs
---
# Rewrite KB nodes and regenerate INDEX / GRAPH

## Objective

Bring `.ai/knowledge-base/nodes/` prose in line with the new Transcript / Proposal vocabulary so the index injected at session start matches the rest of the project, then regenerate `INDEX.md` and `GRAPH.md` deterministically from the updated nodes.

## Skills Required

`docs` — Markdown prose edits in KB nodes.

## Acceptance Criteria

- [ ] Every KB node under `.ai/knowledge-base/nodes/` whose body references `stage-2`, `stage 1`, `Stage 1`, `Stage 2`, `stage2`, `Stage2`, `stage_2_*`, `_logs/stage-2/`, or `kb-stage2-drain` is rewritten to use Transcript / Proposal vocabulary.
- [ ] No retrospective framing: nodes describe the current design only. No "previously this was called Stage 2" anywhere in node bodies. Per project rules, the CHANGELOG is the only home for the rename history (handled by sibling task 5).
- [ ] No em-dashes or hyphen-as-dash separators introduced.
- [ ] `.ai/knowledge-base/INDEX.md` and `.ai/knowledge-base/GRAPH.md` are regenerated and contain no `stage-2`, `Stage 1`, `Stage 2`, `Stage2`, or `stage2` text.
- [ ] The meta-node `.ai/knowledge-base/nodes/practice/practice-rename-stage-vocab-to-transcript-proposal.md` (which described the *planned* rename) is deleted with `git rm`, since once the rename lands it becomes retrospective framing — forbidden outside CHANGELOG.
- [ ] `grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" .ai/knowledge-base/nodes/ .ai/knowledge-base/INDEX.md .ai/knowledge-base/GRAPH.md` returns zero hits.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- KB nodes are plain Markdown with YAML frontmatter (`name`, `description`, `metadata.type`).
- `INDEX.md` and `GRAPH.md` are generated deterministically by `npx ai-knowledge-base index rebuild` from the nodes directory, per `practice-determinism-contract.md` and `practice-index-graph-regen-on-curate-and-precommit.md`.
- The lint-staged pre-commit hook also regenerates them; either path is fine.

## Input Dependencies

None at the file-edit level — KB prose is independent of source code edits.

## Output Artifacts

- Rewritten KB node bodies under `.ai/knowledge-base/nodes/`.
- Regenerated `.ai/knowledge-base/INDEX.md` and `.ai/knowledge-base/GRAPH.md`.

## Implementation Notes

<details>
<summary>Detailed step-by-step</summary>

1. Survey the offenders:
   ```bash
   grep -rln "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" .ai/knowledge-base/nodes/
   ```
   Expected offenders (the plan calls these out, but the grep is authoritative):
   - `.ai/knowledge-base/nodes/map/map-claude-hooks.md`
   - `.ai/knowledge-base/nodes/practice/practice-hooks-meet-1s-deadline.md`
   - `.ai/knowledge-base/nodes/map/map-adapter-interface.md`
   - `.ai/knowledge-base/nodes/map/map-practice-node.md`
   - `.ai/knowledge-base/nodes/map/map-map-node.md`
   - `.ai/knowledge-base/nodes/map/map-sessions-directory.md`
   - `.ai/knowledge-base/nodes/map/map-state-json-file.md`
   - `.ai/knowledge-base/nodes/practice/practice-recursion-guard-env-var.md`
   - Any others the grep surfaces.

2. For each offending node, rewrite the body using the dictionary:

   | Old prose | New prose |
   |-----------|-----------|
   | "stage-2 drain" | "proposal drain" |
   | "stage-2 extractor" / "stage-2 extraction" | "proposal extractor" / "proposal extraction" |
   | "stage 1 capture" / "Stage 1 capture" | "transcript capture" |
   | "Stage 2 output" / "stage-2 output" | "proposal output" |
   | "`stage_2_status`" / etc. | "`proposal_status`" / etc. |
   | "`_logs/stage-2/`" | "`_logs/proposal/`" |
   | "`kb-stage2-drain.mjs`" | "`kb-proposal-drain.mjs`" |
   | "## Stage 1" / "## Stage 2" section labels in node bodies | "## Transcript" / "## Proposal" |

   Frontmatter `description:` lines may also need editing if they describe the pipeline using the old names. Keep the rest of the frontmatter (slug `name`, `metadata.type`) unchanged.

3. Do not write `(formerly Stage 2)` or analogous retrospective phrasing anywhere. Describe the current pipeline only.

4. After editing nodes, regenerate the index:
   ```bash
   npx ai-knowledge-base index rebuild
   ```
   If the CLI is not directly invokable in this environment, the lint-staged pre-commit hook will regenerate `INDEX.md` and `GRAPH.md` at commit time (see `practice-index-graph-regen-on-curate-and-precommit.md`). Either is acceptable — what matters is the committed files reflect the rename.

5. Verify:
   ```bash
   grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" \
     .ai/knowledge-base/nodes/ .ai/knowledge-base/INDEX.md .ai/knowledge-base/GRAPH.md
   ```
   Expect zero output.

Coordination notes:
- Do NOT touch `src/`, `tests/`, `templates/`, `src/templates-source/`, `PRD.md`, `IMPLEMENTATION.md`, `README.md`, `docs/`, `CHANGELOG.md`.
- Do NOT remove or rename node files; only their bodies (and `description:` if needed) change.
- No em-dashes; no retrospective framing.

</details>
