---
id: 1
group: "code-rename"
dependencies: []
status: "completed"
created: 2026-05-12
skills:
  - typescript
---
# Rename schemas, source code, build wiring, and runtime config

## Objective

Rename every Stage 1 / Stage 2 identifier, file, frontmatter key, config key, lock name, log subdir, and `schema_version` literal to the new `Transcript` / `Proposal` vocabulary across `src/lib/`, `src/hooks/`, `src/commands/`, `tsup.config.ts`, `.ai/knowledge-base/config.yaml`, `.claude/settings.json`, and the compiled `.claude/hooks/` artifacts so the package emits hooks, validates settings, and writes session logs entirely under the new names.

## Skills Required

`typescript` — TypeScript + Zod schema edits, file renames, build-tool configuration.

## Acceptance Criteria

- [ ] `src/lib/schemas.ts` declares `ProposalStatusSchema`/`ProposalStatus`, `ProposalCandidateSchema`/`ProposalCandidate`, `ProposalOutputSchema`/`ProposalOutput`, frontmatter keys `proposal_status`/`proposal_completed_at`/`proposal_error`/`proposal_log`, settings keys `proposalTimeout`/`proposalModel`. Every shape carrying `schema_version` literally equals `2`.
- [ ] `src/lib/stage2-drain.ts` is moved to `src/lib/proposal-drain.ts`; exports `PROPOSAL_LOCK_NAME = 'proposal-drain'`, `drainProposalQueue`, type `ProposalRunner`, helper `proposalLogPath` using log subdir `'proposal'`.
- [ ] `src/hooks/kb-stage2-drain.ts` is moved to `src/hooks/kb-proposal-drain.ts`; all imports updated.
- [ ] `src/lib/logs-prune.ts` has `LOG_BUCKETS = ['proposal', 'curator', 'bootstrap-incremental']`.
- [ ] `src/lib/session-log.ts` emits `## Transcript` and `## Proposal` section headings and the new frontmatter keys with `schema_version: 2`; the placeholder is `(populated by proposal worker)`.
- [ ] `src/lib/proposal-drain.ts` parses `## Transcript` / `## Proposal` sections.
- [ ] `tsup.config.ts` entry uses `'kb-proposal-drain': 'src/hooks/kb-proposal-drain.ts'`.
- [ ] `src/commands/init.ts` registers `node .claude/hooks/kb-proposal-drain.mjs`.
- [ ] `src/commands/doctor.ts` expected-hook list mentions `kb-proposal-drain.mjs`; expected-prompt list mentions `proposal-extract.md`.
- [ ] `src/lib/settings.ts` `MODEL_CHOICE_KEYS` is `['proposalModel', 'curatorModel', 'bootstrapModel']`; defaults map updates `proposalTimeout: 60000`.
- [ ] `.ai/knowledge-base/config.yaml` carries `schema_version: 2`, `proposalTimeout: 60000`, and the commented `# proposalModel:` example.
- [ ] `.claude/settings.json` SessionStart hook command path is `node .claude/hooks/kb-proposal-drain.mjs`.
- [ ] `npm run build` produces `.claude/hooks/kb-proposal-drain.mjs`; the old `.claude/hooks/kb-stage2-drain.mjs` is deleted from the repo (do not commit it back).
- [ ] `grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" src/ .ai/knowledge-base/config.yaml .claude/settings.json tsup.config.ts` returns zero hits.
- [ ] `npm run typecheck` and `npm run lint` are green after the rename across these surfaces (tests are renamed by another task — running `npm test` is out of scope here, but typecheck must compile).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TypeScript with Zod schemas (`src/lib/schemas.ts` is the canonical declaration).
- `tsup` bundles `src/hooks/*.ts` → `.claude/hooks/*.mjs`.
- Strict Zod schemas — every key rename must be reflected in both the schema and every reader/writer or runtime parse will fail.
- The plan document at `.ai/task-manager/plans/02--rename-stages-to-transcript-and-proposal/plan-02--rename-stages-to-transcript-and-proposal.md` is the authoritative rename dictionary.

## Input Dependencies

None — this task is the foundation; other tasks read the same plan dictionary but edit disjoint files.

## Output Artifacts

- Renamed source files and updated identifiers across `src/`.
- Updated `.ai/knowledge-base/config.yaml`, `.claude/settings.json`, `tsup.config.ts`.
- Rebuilt `.claude/hooks/kb-proposal-drain.mjs`; deleted `.claude/hooks/kb-stage2-drain.mjs`.

## Implementation Notes

<details>
<summary>Detailed step-by-step</summary>

Authoritative rename dictionary (apply uniformly):

| Old | New |
|-----|-----|
| `Stage2StatusSchema` / `Stage2Status` | `ProposalStatusSchema` / `ProposalStatus` |
| `Stage2CandidateSchema` / `Stage2Candidate` | `ProposalCandidateSchema` / `ProposalCandidate` |
| `Stage2OutputSchema` / `Stage2Output` | `ProposalOutputSchema` / `ProposalOutput` |
| `Stage2Runner` | `ProposalRunner` |
| `STAGE2_LOCK_NAME` / `'stage2-drain'` | `PROPOSAL_LOCK_NAME` / `'proposal-drain'` |
| `drainStage2Queue` | `drainProposalQueue` |
| `stage2LogPath` | `proposalLogPath` |
| `stage_2_status` | `proposal_status` |
| `stage_2_completed_at` | `proposal_completed_at` |
| `stage_2_error` | `proposal_error` |
| `stage_2_log` | `proposal_log` |
| `stage2Timeout` | `proposalTimeout` |
| `stage2Model` | `proposalModel` |
| `_logs/stage-2/` subdir | `_logs/proposal/` subdir |
| `## Stage 1: redacted transcript slice` heading | `## Transcript` heading |
| `## Stage 2: structured summary` heading | `## Proposal` heading |
| `(populated by stage-2 worker)` placeholder | `(populated by proposal worker)` placeholder |
| `kb-stage2-drain` (filenames, identifiers, hook key) | `kb-proposal-drain` |
| `stage-2-extract.md` (referenced in resolver paths) | `proposal-extract.md` |
| `schema_version: 1` (every shape) | `schema_version: 2` |

Step-by-step:

1. Edit `src/lib/schemas.ts` first — rename every Zod schema, every TS type, every literal key in frontmatter/settings/queue/dedup-cache/bootstrap-state. Bump every `schema_version` literal to `2`.
2. `git mv src/lib/stage2-drain.ts src/lib/proposal-drain.ts`. Inside the file, rename the exported lock constant, function, type, and helper per the dictionary; replace the `## Stage 1` / `## Stage 2` regex with `## Transcript` / `## Proposal`; replace any `_logs/stage-2` references with `_logs/proposal`.
3. `git mv src/hooks/kb-stage2-drain.ts src/hooks/kb-proposal-drain.ts`. Update its imports to `../lib/proposal-drain.js`, update any error-message strings.
4. Sweep every other file under `src/lib/`, `src/hooks/`, `src/commands/` and update imports, identifier references, string literals, error messages, and section headings per the dictionary. Files known to need edits: `src/lib/session-log.ts`, `src/lib/session-start.ts`, `src/lib/curate.ts`, `src/lib/logs-prune.ts`, `src/lib/secret-scan.ts`, `src/lib/settings.ts`, `src/lib/headless.ts`, `src/lib/state.ts`, `src/lib/queue.ts`, `src/hooks/kb-capture.ts`, `src/hooks/kb-session-start.ts`, `src/commands/init.ts`, `src/commands/doctor.ts`, `src/commands/status.ts`, `src/commands/logs-prune.ts`. Verify with `grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" src/`.
5. Edit `tsup.config.ts`: change the entry key from `'kb-stage2-drain'` to `'kb-proposal-drain'` and its source path to `src/hooks/kb-proposal-drain.ts`.
6. Edit `.ai/knowledge-base/config.yaml`: bump `schema_version` to `2`, rename `stage2Timeout` to `proposalTimeout`, rename the commented `# stage2Model:` example block to `# proposalModel:` (keep nested `name`/`effort` shape).
7. Edit `.claude/settings.json` if it contains a SessionStart hook entry pointing at `kb-stage2-drain.mjs`, changing the command path to `node .claude/hooks/kb-proposal-drain.mjs`.
8. Run `npm run build`. Confirm `.claude/hooks/kb-proposal-drain.mjs` exists. `git rm .claude/hooks/kb-stage2-drain.mjs` (or `rm` then verify it's not tracked); the build output is committed per the repo's pattern.
9. Run `npm run typecheck`. Resolve any compilation errors caused by remaining stale identifiers — `tsc` will pinpoint them.
10. Run `npm run lint`. Resolve any lint errors.
11. Final grep:
    ```bash
    grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" \
      src/ .ai/knowledge-base/config.yaml .claude/settings.json tsup.config.ts
    ```
    Expect zero output.

Coordination notes:
- Do NOT edit `src/templates-source/prompts/`, `templates/`, `tests/`, `nodes/`, `PRD.md`, `IMPLEMENTATION.md`, `README.md`, `docs/`, or `CHANGELOG.md` — those are owned by sibling tasks 2–5.
- The plan's "no migrators" rule applies: no shim, no alias, no legacy key fallback in schemas — `.strict()` Zod schemas reject the old keys, which is intended.
- Per project rules, no retrospective framing in code comments ("formerly Stage 2", "legacy"). The new names stand on their own.
- No em-dashes in any prose you write.

</details>
