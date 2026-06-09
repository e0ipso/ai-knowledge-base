---
id: 4
group: "self-description"
dependencies: [2]
status: "pending"
created: 2026-06-09
skills:
  - skill-authoring
complexity_score: 5
complexity_notes: "Single-source edit with a four-copy regeneration pipeline (templates build plus three installed harness copies); the dispatch prose must match the migrate status JSON contract and registry step id exactly or runtime dispatch breaks."
---
# Rewrite the kk-migrate SKILL.md as a generic dispatcher and regenerate all copies

## Objective
Rewrite the skill's single source of truth at `src/templates-source/skills/kk-migrate/SKILL.md` from a v1→v2-only procedure into a generic dispatcher: query `migrate status` first, then execute one documented per-step procedure section per chain entry — with the existing v1→v2 content becoming the `flat-to-tree` procedure section, substance unchanged. Bump the version marker and regenerate the built template and the repo's installed harness copies through the build/install flow.

## Skills Required
- `skill-authoring` — restructuring agent-facing SKILL.md prose with exact command contracts, plus driving the repo's template build/install pipeline.

## Acceptance Criteria
- [ ] The frontmatter `description` changes from "migrate a v1 KB to v2" to running *any* pending knowledge-base migration, keeping the existing trigger conditions (node reader / `doctor` / `init` guidance, or explicit user request).
- [ ] The body opens with a dispatch step before everything else: run `migrate status`; on a "nothing to do" line, stop and report that line to the user; otherwise parse the single JSON line and execute each chain entry's procedure section in order. If a chain entry's step `id` has no matching procedure section in the skill, the agent stops and reports to the user rather than improvising.
- [ ] The existing v1→v2 content (inventory → in-host clustering → user review of the proposed grouping → `place apply` → `index rebuild` → git-free hand-off) becomes the `flat-to-tree` procedure section, unchanged in substance, headed by the exact step id the registry/`migrate status` emits.
- [ ] The harness-resolution block and the Constraints section (in-host only, never write node files directly, never invoke git, ids and edges are sacred, interactive session required) remain skill-global, outside any per-step section.
- [ ] The `<!-- Version: 1 -->` marker bumps to `<!-- Version: 2 -->`.
- [ ] The built `templates/skills/kk-migrate/SKILL.md` and the repo's installed dogfood copies (`.agents/skills/kk-migrate/`, `.claude/skills/kk-migrate/`, `.opencode/skills/kk-migrate/`) are regenerated through the build/install flow — never hand-edited — and are content-identical to the source flow (verify by diff).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Edit only `src/templates-source/skills/kk-migrate/SKILL.md`; `npm run build` (its `build:templates` step) produces `templates/skills/kk-migrate/SKILL.md`; the installed harness copies are refreshed via the repo's init/upgrade dogfood flow (consult AGENTS.md / the kenkeep `cli` knowledge branch for the exact invocation rather than copying files manually).
- The dispatch step's documented command and JSON shape must match task 2's actual contract (detected version + ordered `steps` with `id`/`from`/`to`/`primitives`), and the procedure-section heading must carry the step id `flat-to-tree` exactly as the registry emits it.

## Input Dependencies
- Task 2: the `migrate status` command and its JSON contract, which the dispatch step documents verbatim.
- Soft dependency on task 3: the gated `place` contract; the flat-to-tree procedure's substance is unchanged by the gate (dispatch guarantees the step matches before the primitives run), so no prose depends on task 3's exact messages.

## Output Artifacts
- The rewritten SKILL.md source, built template, and three regenerated installed copies — the user-facing half of generic dispatch, satisfying primary success criterion 4.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

Current source structure (src/templates-source/skills/kk-migrate/SKILL.md): frontmatter description; `<!-- Version: 1 -->`; intro ("You are the migrator…" — currently v1→v2-specific); "Resolve the active harness" block; numbered steps 1–5 (inventory, cluster, apply, rebuild, hand off); Constraints. Target structure:

1. Frontmatter: generic description, e.g. "Run any pending knowledge-base migration by querying the deterministic migration chain and executing each pending step's documented procedure in-host… Use when the node reader, `doctor`, or `init` reports an out-of-date schema / legacy layout and asks you to migrate, or when the user asks to migrate the knowledge base."
2. `<!-- Version: 2 -->`.
3. Generic intro: you are the migrator for *any* pending migration; judgment runs in this session; every write goes through deterministic step primitives.
4. Harness-resolution block — keep as-is, skill-global (still needed by `index rebuild` in the flat-to-tree step).
5. New "Dispatch" step: run the inventory-style command (keep the invocation convention the file already uses, `npx --yes kenkeep@latest`, applied to `migrate status`); on a "nothing to do" line, stop and report it; otherwise stdout is exactly one JSON line — show the shape from task 2. For each `steps[]` entry in order, find the procedure section matching its `id` and execute it; if no section matches, **stop and report to the user** that the skill copy predates the registered step (this is the plan's drift mitigation — state it explicitly in the prose).
6. Per-step procedure section for `flat-to-tree` (1 → 2): carry over current steps 1–5 essentially verbatim. The current step 1's "stop on nothing-to-do" framing can shrink since dispatch already established the migration is due, but keep the inventory JSON shape documentation, the clustering rules, the user-review-before-apply requirement, the apply/rebuild commands, and the hand-off prose intact.
7. Constraints section — keep skill-global and unchanged in substance.

Regeneration: after editing the source, run `npm run build` and confirm `templates/skills/kk-migrate/SKILL.md` matches. The three installed copies in this repo (`.agents/`, `.claude/`, `.opencode/`) were materialized by init/upgrade; refresh them the same way (the `<!-- Version -->` bump is what makes init/upgrade overwrite them). Finish with diffs proving source, built template, and the three installs are content-identical — this is self-validation step 5 of the plan.

Do not add a speculative second procedure section, headless mode, or any v2→v3 artifact — the plan's scope note forbids it.

</details>
