---
id: 3
group: "tests"
dependencies: []
status: "pending"
created: 2026-05-12
skills:
  - typescript
  - unit-testing
---
# Rename tests and fixtures to Proposal vocabulary

## Objective

Rename every test file and fixture that references `Stage 1`, `Stage 2`, `stage_2_*`, `stage-2/`, `stage2-drain`, `Stage2*`, or the old prompt filename so the test suite verifies the *new* contract end-to-end. After this task lands together with sibling task 1, `npm test` should be green against the renamed code.

## Skills Required

`typescript`, `unit-testing` — TS test edits with Vitest, fixture updates.

**Meaningful Test Strategy reminder:** This task is a rename of existing tests, not new test authoring. The mantra is "write a few tests, mostly integration." Do not add new tests. Do not add tests for trivially-renamed code paths. Only update existing assertions, fixtures, file names, and imports to match the new vocabulary.

## Acceptance Criteria

- [ ] `tests/lib/stage2-drain.test.ts` is moved to `tests/lib/proposal-drain.test.ts` and all internal references (`Stage2*` identifiers, `stage_2_*` keys, `stage2-drain` lock, `_logs/stage-2/` paths) are updated.
- [ ] `tests/hooks/kb-stage2-drain.test.ts` is moved to `tests/hooks/kb-proposal-drain.test.ts` and updated.
- [ ] Every test file under `tests/` that asserts on `stage_2_*` keys, `stage-2/` paths, `stage2-drain` locks, `Stage2*` identifiers, `## Stage 1` / `## Stage 2` headings, `kb-stage2-drain.mjs`, `stage2Timeout`, `stage2Model`, or the `stage-2-extract.md` prompt filename is updated to the Proposal vocabulary.
- [ ] Every fixture under `tests/fixtures/` (notably `tests/fixtures/transcripts/*/expected.md` and any associated session-log samples) has its `## Stage 1` / `## Stage 2` headings replaced with `## Transcript` / `## Proposal`, its frontmatter keys renamed (`stage_2_status` → `proposal_status`, etc.), and `schema_version: 2`.
- [ ] `tests/fixtures/README.md` prose is updated.
- [ ] `grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" tests/` returns zero hits.
- [ ] `npm run typecheck` is green (running the full test suite to green is reserved for POST_EXECUTION since it depends on sibling tasks 1, 2, 4, 5 also landing).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Vitest is the test runner; imports use `.js` ESM specifiers despite source being `.ts`.
- Fixtures are plain Markdown files; some live alongside `expected.md` and a `transcript.md` input.
- The plan document at `.ai/task-manager/plans/02--rename-stages-to-transcript-and-proposal/plan-02--rename-stages-to-transcript-and-proposal.md` is the authoritative dictionary.

## Input Dependencies

None at the file-edit level — this task reads the same rename dictionary from the plan and updates tests in parallel with sibling task 1.

## Output Artifacts

- Renamed test files and updated test bodies.
- Updated fixtures under `tests/fixtures/`.

## Implementation Notes

<details>
<summary>Detailed step-by-step</summary>

Files to rename:
- `tests/lib/stage2-drain.test.ts` → `tests/lib/proposal-drain.test.ts`
- `tests/hooks/kb-stage2-drain.test.ts` → `tests/hooks/kb-proposal-drain.test.ts`

Files to sweep with the rename dictionary (non-exhaustive — use `grep` to find every offender):
- `tests/doctor.test.ts`, `tests/doctor-dangling.test.ts`, `tests/init.test.ts`, `tests/upgrade.test.ts`, `tests/logs-prune.test.ts`
- `tests/lib/capture.test.ts`, `tests/lib/settings.test.ts`, `tests/lib/curate.test.ts`, `tests/lib/state.test.ts`, `tests/lib/session-log.test.ts`, `tests/lib/headless.test.ts`, `tests/lib/conflicts.test.ts`, `tests/lib/session-start.test.ts`, `tests/lib/logs-prune.test.ts`, `tests/lib/queue.test.ts`, `tests/lib/secret-scan.test.ts`
- `tests/hooks/kb-capture.test.ts`
- `tests/helpers.ts`

Rename dictionary (apply uniformly across tests and fixtures):

| Old | New |
|-----|-----|
| `Stage2StatusSchema`/`Stage2Status` | `ProposalStatusSchema`/`ProposalStatus` |
| `Stage2CandidateSchema`/`Stage2Candidate` | `ProposalCandidateSchema`/`ProposalCandidate` |
| `Stage2OutputSchema`/`Stage2Output` | `ProposalOutputSchema`/`ProposalOutput` |
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
| `_logs/stage-2/` | `_logs/proposal/` |
| `## Stage 1: redacted transcript slice` | `## Transcript` |
| `## Stage 2: structured summary` | `## Proposal` |
| `kb-stage2-drain` (filenames, hook keys) | `kb-proposal-drain` |
| `stage-2-extract.md` | `proposal-extract.md` |
| `schema_version: 1` | `schema_version: 2` |

Step-by-step:

1. `git mv tests/lib/stage2-drain.test.ts tests/lib/proposal-drain.test.ts`.
2. `git mv tests/hooks/kb-stage2-drain.test.ts tests/hooks/kb-proposal-drain.test.ts`.
3. Inside the renamed test files: update `import { ... } from '../../src/lib/proposal-drain.js'` (note `.js` suffix), update the `describe(...)` title, and replace every dictionary entry.
4. Sweep the remaining test files listed above. Update assertions, expected strings, fixture paths, hook-name strings, and any test-only helpers.
5. Walk `tests/fixtures/` and update every fixture:
   - Replace `## Stage 1` and `## Stage 2` headings with `## Transcript` and `## Proposal`.
   - Replace `stage_2_status`, `stage_2_completed_at`, `stage_2_error`, `stage_2_log` keys.
   - Bump `schema_version: 1` to `schema_version: 2` in any frontmatter that carried it.
   - Replace `(populated by stage-2 worker)` placeholders with `(populated by proposal worker)`.
6. Update `tests/fixtures/README.md` prose.
7. Verify:
   ```bash
   grep -rn "stage[ _-]\?[12]\|Stage 1\|Stage 2\|Stage2\|stage2" tests/
   ```
   Expect zero output.
8. Run `npm run typecheck`. Resolve any compilation errors (these will most likely be stale type imports). Do not run `npm test` here — sibling tasks land in the same phase and the full suite passes only after the phase commit.

Coordination notes:
- Do NOT touch `src/`, `templates/`, `src/templates-source/`, `nodes/`, `PRD.md`, `IMPLEMENTATION.md`, `README.md`, `docs/`, `CHANGELOG.md`.
- Do not introduce new tests; this is a rename, not new coverage.
- No em-dashes; no retrospective framing in test descriptions ("formerly tested Stage 2" — forbidden).

</details>
