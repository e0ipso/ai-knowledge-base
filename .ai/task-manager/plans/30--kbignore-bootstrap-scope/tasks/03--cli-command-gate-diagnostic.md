---
id: 3
group: "cli-command"
dependencies: [2]
status: "completed"
created: "2026-05-22"
skills:
  - typescript
  - cli-tools
---
# `bootstrap-incremental` CLI/command refactor: remove old flags, add `--yes` confirmation gate, format empty-set diagnostic

## Objective

Strip `--from`, `--include`, `--exclude` from the CLI surface and the command's options/context types. Add `--yes` / `-y`. Introduce a `previewBootstrapIncremental` seam so the command can resolve candidates before lock acquisition, then present an interactive y/N gate (with `--yes` bypass, non-TTY abort, `--dry-run` skip) before any LLM call. Format the new empty-set diagnostic using `scannedBeforeFilter` from Task 2.

## Skills Required

- typescript
- cli-tools

## Acceptance Criteria

- [ ] `src/cli.ts`: `bootstrap-incremental` command no longer declares `.requiredOption('--from …')`, `.option('--include …')`, or `.option('--exclude …')`. Action signature and forwarded options have no `from`/`include`/`exclude` fields. `grep -RE -- '--from|--include|--exclude' src/cli.ts src/commands/bootstrap-incremental.ts` returns no matches.
- [ ] `--yes` / `-y` flag added: boolean, default false, description `"skip the pre-run confirmation prompt"`.
- [ ] Command `.description()` reads: `Incrementally bootstrap the KB from markdown docs in this repo; scope is controlled by .kbignore.`
- [ ] `BootstrapIncrementalOptions` drops `from`, `include`, `exclude`. Adds `yes?: boolean`. `dryRun`, `timeoutMs`, `harness` remain.
- [ ] `sourceDir` existence check at `bootstrap-incremental.ts:38–42` is removed.
- [ ] A `previewBootstrapIncremental(ctx)` (or equivalent shape) performs discovery + state-diff + memory merge and returns the candidate list (and the `scannedBeforeFilter` count when relevant) WITHOUT acquiring the lock or running the runner. `runBootstrapIncremental` accepts the pre-resolved candidate list (or is invoked after the gate via a parameter that suppresses re-discovery).
- [ ] Gate behavior (in `bootstrap-incremental.ts`, after preview, before run):
  - `--dry-run`: skip the prompt entirely; print the resolved list as today.
  - TTY + no `--yes`: print `Found N file(s) to process:`, then sorted posix `  <relPath>` lines (including `memory://<name>` entries), then `Proceed? [y/N] `. Accept `y`/`Y`/`yes` (case-insensitive). Anything else aborts cleanly with `Aborted; no changes made.` (exit 0).
  - Non-TTY + no `--yes`: abort with `Refusing to run non-interactively without --yes. Re-run with --yes to confirm.` Exit code 2.
  - `--yes`: print the list (no prompt) and proceed.
  - Zero markdown candidates after state-diff but non-zero discovered: print diagnostic (see below) and exit 0.
- [ ] Empty-set diagnostic in command layer (not in lib):
  - `scannedBeforeFilter > 0`: `Scanned N markdown file(s); 0 survived .kbignore + .gitignore filters. Check patterns in <abs path to .kbignore>.`
  - `scannedBeforeFilter === 0`: `No markdown files found under <repo root>. Check that you are running from a project containing .md files.`
  - If markdown is zero but memory candidates exist, the diagnostic does NOT fire — the gate proceeds with memory entries listed.
- [ ] TTY check is `process.stdin.isTTY && process.stdout.isTTY`. Prompt uses Node's built-in `readline` (no new dependency).
- [ ] `tests/commands/bootstrap-incremental.test.ts` (new or extended) covers: `--yes` bypass; TTY-mocked `y` → run, `n` → clean abort; non-TTY without `--yes` aborts with exit 2; `--dry-run` skips the prompt; diagnostic variants (zero-scanned vs zero-surviving); memory-only candidate path (no diagnostic, gate proceeds).
- [ ] `npm run build` and `npm test` pass. `node dist/cli.js bootstrap-incremental --help` shows `--yes`, `--dry-run`, `--timeout`, `--harness`; does NOT show `--from`/`--include`/`--exclude`.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- `src/cli.ts` (command declaration around lines 92–130).
- `src/commands/bootstrap-incremental.ts` (options shape, gate, diagnostic).
- `src/lib/bootstrap.ts` (introduce `previewBootstrapIncremental` and adjust `runBootstrapIncremental` to accept pre-resolved candidates if not already split in Task 2).
- New / extended `tests/commands/bootstrap-incremental.test.ts` (mock TTY via `Object.defineProperty(process.stdout, 'isTTY', ...)` patterns common in vitest setups).
- Node built-in `readline` for the prompt.

## Input Dependencies

- Task 2: `DiscoverOptions` already updated, `BootstrapResult.scannedBeforeFilter` available, harness skip patterns gone.

## Output Artifacts

- Clean CLI surface that Task 5 (docs) describes.
- Gate + diagnostic behavior that Task 4 (doctor) complements (doctor catches missing `.kbignore` before the gate runs).

## Implementation Notes

<details>
<summary>Guidance</summary>

- Prefer the `previewBootstrapIncremental` route over hoisting discovery into the command layer — keeping discovery + state-diff in the lib preserves the lib's responsibility and minimizes command-layer logic.
- The candidate list in the gate must be the same sorted posix list the runner would process — sort once in the preview and pass the array through.
- For `memory://` entries: include them in the printed list as-is so the user sees memory ingestion will happen. Their presence prevents the diagnostic message but does not change gate behavior otherwise.
- Use `readline.createInterface({ input: process.stdin, output: process.stdout })` and close it whether the user proceeds or aborts. Wrap the `question` callback in a Promise for `async`-friendly flow.
- The `n` path is exit 0 (clean abort, not a failure). Non-TTY abort is exit 2 (configuration error). Match these exactly — the self-validation script checks them.
- Don't add a "press y to skip in future" hint; `--yes` is documented in `--help` and README (Task 5) is sufficient.
- TTY mocking pattern for tests: set `process.stdout.isTTY = true/false` and `process.stdin.isTTY = true/false` inside a `beforeEach`, restore in `afterEach`. For input simulation, you may need to inject a fake `readline` interface; if the prompt is encapsulated in a small helper, mock the helper instead.
- The non-TTY error message wording is specified verbatim — match it for the self-validation step that may grep for it.
- Keep `runBootstrapIncremental`'s lock acquisition (`bootstrap.ts:362`) inside the runner. The gate runs before lock, so an abort-at-prompt does not block concurrent KB operations.

</details>
