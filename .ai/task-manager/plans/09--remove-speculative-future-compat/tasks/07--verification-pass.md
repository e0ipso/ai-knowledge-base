---
id: 7
group: "verification"
dependencies: [1, 2, 3, 4, 5, 6]
status: "pending"
created: 2026-05-13
skills: ["bash", "typescript"]
---
# End-to-End Verification Pass

## Objective
Run the full static checks, type checks, and test suite, then execute the CLI in a temporary scratch directory to confirm `init`, `doctor`, `node add`, `curate`, and `bootstrap-incremental` all behave correctly after the removals.

## Skills Required
- `bash`: shell-script the CLI smoke test in a scratch directory.
- `typescript`: interpret typecheck and test failures if any surface.

## Acceptance Criteria
- [ ] `rg -n "depends_on" src/ tests/ src/templates-source/` returns no hits (acceptable only inside `.ai/task-manager/archive/`, the plan file, the CHANGELOG).
- [ ] `rg -n "\\.topics\\b|topics: \\[\\]" src/ tests/` returns no structural hits.
- [ ] `rg -n "Adapter\\b|ClaudeAdapter|RoleTaggedTranscript\\.(user|agent)|HeadlessOpts|SkillSpec|hookInstallPath|skillInstallPath|readTranscript|renderSkill|packageName" src/` returns no hits.
- [ ] `ls src/adapters/ 2>/dev/null` returns nothing (the directory does not exist).
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm test` exits 0. No `it.skip` / `describe.skip` were added by this branch.
- [ ] CLI smoke test in a temporary directory (see Implementation Notes) passes every check: `init` produces a `.claude/settings.json` containing the expected hook entries; `doctor` exits 0; `node add` produces a node file with no `depends_on:` line; `curate` runs (or correctly reports `no-pending` if there are no proposals) without schema errors; `bootstrap-incremental` against a small docs fixture produces nodes with no `depends_on:` line.
- [ ] A node file from the existing `.ai/knowledge-base/nodes/` tree that still carries `depends_on: []` parses successfully via `parseNodeFrontmatter` (or whichever helper reads node frontmatter); `lint` reports no errors caused by the leftover line.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- A scratch directory under `/tmp/` for the CLI smoke run.
- The compiled CLI (`node dist/cli.js`) or a `tsx`/`ts-node` entrypoint; consult `package.json` for the canonical invocation.

## Input Dependencies
- Tasks 1-6 must be complete.

## Output Artifacts
- A successful test/typecheck run; no source changes expected from this task unless a verification step surfaces a regression that must be fixed (in which case the fix lands here).

## Implementation Notes

<details>
<summary>Step-by-step verification recipe</summary>

1. **Static sweeps**: run the four `rg` commands listed in Acceptance Criteria and confirm zero hits (or only acceptable hits as noted). Investigate and fix any stragglers before proceeding.

2. **Build/typecheck**:
   - `npx tsc --noEmit` and confirm exit 0.
   - Run the project's actual build if present (`npm run build` or the equivalent listed in `package.json` `scripts`).

3. **Tests**: `npm test` and confirm exit 0. If any tests fail, fix the root cause (do not skip tests). If a test was previously written specifically to assert the existence of a removed field or class, the test itself should have been removed in an earlier task; if one was missed, remove it now.

4. **CLI smoke run** (in a temporary scratch directory):
   ```bash
   scratch=$(mktemp -d /tmp/kb-validate-XXXX)
   cd "$scratch"
   git init -q
   # run init pointing at this scratch dir; consult package.json bin entry for canonical command
   node /workspace/dist/cli.js init --assistants claude
   # confirm settings.json shape
   cat .claude/settings.json | jq '.hooks | keys'
   # expected keys present: Stop, SessionEnd, PreCompact, SessionStart
   node /workspace/dist/cli.js doctor
   # node add (interactive — if not scriptable, exercise via the same fixture the tests use)
   node /workspace/dist/cli.js node add --kind practice --title "Verify removal" --tags x --confidence medium --summary "test" --body "body"
   # confirm the produced node file has no depends_on
   ! grep -q "depends_on" .ai/knowledge-base/nodes/practice/practice-verify-removal.md
   # curate (no pending proposals → no-pending branch)
   node /workspace/dist/cli.js curate
   # bootstrap-incremental against a tiny doc fixture
   mkdir -p docs
   echo "# Sample\n\nA practice note." > docs/sample.md
   node /workspace/dist/cli.js bootstrap-incremental --from docs
   # confirm no produced node carries depends_on
   ! grep -rn "depends_on" .ai/knowledge-base/nodes/
   ```
   Each step must succeed. Capture stdout/stderr for any non-zero exit and triage.

5. **On-disk schema drift sanity**: pick one node file from `.ai/knowledge-base/nodes/` that still contains `depends_on: []` (left over from before this branch). Open it via a one-liner Node REPL importing the project's node parser (e.g. `readAllNodes`) and confirm it parses without throwing. Run `node dist/cli.js lint` and confirm no errors caused by the stale line.

6. **Test guidance** (carry-over from the global task guidance):

   Your critical mantra for test generation is: "write a few tests, mostly integration".

   - **When TO write tests**: custom business logic, critical workflows, edge cases of removed functionality (e.g. that the new free-function path still merges hooks correctly), integration points.
   - **When NOT to write tests**: framework features, simple property removals (the typechecker covers those), getter/setter behavior.
   - This verification task does not itself author new tests; it confirms the test additions made in Tasks 1-4 cover the relocated logic adequately.

7. **Outcome**: if every check passes, the branch is ready. If anything is red, fix the root cause (file an exception in the task if the fix is large enough to warrant a separate task — but small fixes belong here).

</details>
