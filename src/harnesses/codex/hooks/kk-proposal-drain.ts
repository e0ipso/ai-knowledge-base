/**
 * SessionStart hook for the Codex CLI adapter (proposal drain).
 *
 * Drains the proposal queue by spawning `codex exec --json` for each pending
 * session log. Codex's hook schema carries no async flag (the spec's
 * `async: true` is dropped by the writer), so the hook re-spawns itself
 * detached and returns immediately; the drain's headless LLM runs continue
 * in the background child instead of blocking session start.
 */
import { detachSelf, detachedPayload, isDetachedChild } from '../../../lib/hook-detach.js';
import { appendHookDiagnostic } from '../../../lib/hook-diagnostic.js';
import { findRepoRoot, repoPaths } from '../../../lib/paths.js';
import { runProposalDrain } from '../../../lib/proposal-drain.js';
import { readStdin } from '../../../lib/stdin.js';
import { runHeadlessCodex } from '../headless.js';
import { buildCodexHarnessOpts } from '../opts.js';

async function main(): Promise<void> {
  if (process.env['KENKEEP_BUILDER_INTERNAL'] === '1') return;

  const raw = isDetachedChild() ? detachedPayload() : await readStdin();
  if (!isDetachedChild() && detachSelf(raw)) return;
  let input: { cwd?: unknown } = {};
  if (raw.trim().length > 0) {
    try {
      input = JSON.parse(raw) as { cwd?: unknown };
    } catch (err) {
      const paths = repoPaths(findRepoRoot(process.cwd()));
      appendHookDiagnostic('codex:kk-proposal-drain', 'parse', err, paths.logsDir);
      input = {};
    }
  }
  const startCwd =
    typeof input.cwd === 'string' && input.cwd.length > 0 ? input.cwd : process.cwd();
  await runProposalDrain({
    binaryName: 'codex',
    startCwd,
    runner: async (prompt, stdin, schema, opts) => runHeadlessCodex(prompt, stdin, schema, opts),
    buildHarnessOpts: settings => buildCodexHarnessOpts(settings, 'proposal'),
    harnessTag: 'codex:kk-proposal-drain',
  });
}

void main().catch((err: unknown) => {
  try {
    const paths = repoPaths(findRepoRoot(process.cwd()));
    appendHookDiagnostic('codex:kk-proposal-drain', 'uncaught', err, paths.logsDir);
  } catch {
    // Outside any project / cannot resolve paths — nothing to log to.
  }
  process.exit(0);
});
