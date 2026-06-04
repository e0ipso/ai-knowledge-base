---
id: 10
group: "verification"
dependencies: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: "completed"
created: 2026-06-03
skills:
  - bash
  - vitest
---
# Final verification net

## Objective
Prove the rename is complete and the tool's behavior is unchanged: run the full
green-build gate, a fresh-install CLI smoke test in a throwaway repo, the
source-tree guard greps, and the git-history/package assertions.

## Skills Required
- **bash**: orchestrate build/typecheck/lint/test, temp-repo smoke test, and guard greps.
- **vitest**: interpret/confirm the test-suite results.

## Acceptance Criteria
- [ ] `npm run build && npm run typecheck && npm run lint && npm test` each exit zero (capture the summary lines). `lint` includes `lint:detect-harness`.
- [ ] `node dist/cli.js --help` prints program name `analecta` with subcommands intact.
- [ ] In a throwaway repo (`mktemp -d`, `git init`), `node <repo>/dist/cli.js init --harnesses claude,opencode,codex,cursor` then `... doctor` produces: `.ai/analecta/`, `.anaignore`, `ana-bootstrap/ana-curate/ana-add` skills, `ana-*` hook files, OpenCode `ana-hooks/`, and a passing `doctor`. `grep -rIl 'kb-\|knowledge-base\|\.kbignore' .ai .claude .opencode .codex .cursor` in that temp repo returns nothing.
- [ ] Repo-root guard grep `grep -rIn -e 'ai-knowledge-base' -e 'kb-' -e 'KB_' -e 'kbignore' -e '\.ai/knowledge-base' src scripts docs tests` returns only intentional residue (e.g. a historical CHANGELOG line).
- [ ] `node -e "console.log(require('./package.json').name, Object.keys(require('./package.json').bin))"` prints `analecta [ 'analecta' ]`.
- [ ] `git log --follow .ai/analecta/INDEX.md` shows pre-move history and `test ! -d .ai/knowledge-base` passes.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
This is the release gate from the plan's Success Criteria and Self Validation.
Any failure is a real defect to fix (or, for a grep hit, either an intentional
residue to confirm or a missed rename to repair) — do not weaken a check to make
it pass.

## Input Dependencies
All prior tasks (1–9). This task runs last and validates their combined result.

## Output Artifacts
- A verification report: captured summary lines for each command, confirmation
  of each acceptance criterion, and the disposition of any residual grep hits.

## Implementation Notes
If the docs task included the Jekyll site, optionally also build the docs site
locally and confirm it builds with the new site URL/baseurl and that internal
links resolve (Self Validation step 6).

<details>
<summary>Step-by-step</summary>

1. From the repo root: `npm run build && npm run typecheck && npm run lint && npm test`.
   Confirm each exits zero; capture the final summary line of each.
2. `node dist/cli.js --help` — confirm the program name is `analecta` and all
   subcommands (`init`, `doctor`, `curate`, `bootstrap`, …) are present.
3. Temp-repo smoke test:
   - `TMP=$(mktemp -d); cd "$TMP"; git init`
   - `node <repo>/dist/cli.js init --harnesses claude,opencode,codex,cursor`
   - `node <repo>/dist/cli.js doctor` (must pass)
   - Confirm `.ai/analecta/` and `.anaignore` exist; the Claude skills dir has
     `ana-bootstrap/ana-curate/ana-add`; hook files are `ana-*`; OpenCode dir is
     `ana-hooks/`.
   - `grep -rIl 'kb-\|knowledge-base\|\.kbignore' .ai .claude .opencode .codex .cursor`
     must return nothing. `cd` back and `rm -rf "$TMP"`.
4. Repo-root guard grep:
   `grep -rIn -e 'ai-knowledge-base' -e 'kb-' -e 'KB_' -e 'kbignore' -e '\.ai/knowledge-base' src scripts docs tests`
   — every hit must be either intentional (changelog history) or fixed.
5. Package assertion:
   `node -e "console.log(require('./package.json').name, Object.keys(require('./package.json').bin))"`
   must print `analecta [ 'analecta' ]`.
6. History/absence:
   `git log --follow .ai/analecta/INDEX.md` shows pre-move commits;
   `test ! -d .ai/knowledge-base` exits zero.
7. Record all results in the verification report.
</details>
