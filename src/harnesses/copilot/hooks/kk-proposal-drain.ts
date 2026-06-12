/**
 * SessionStart hook for the GitHub Copilot CLI adapter (proposal drain).
 *
 * Drains the proposal queue by spawning `copilot -p` for each pending
 * session log. Copilot's hook config carries no async mechanism and caps
 * hooks at timeoutSec, so the hook re-spawns itself detached and returns
 * immediately; the drain's headless LLM runs continue in the background
 * child instead of blocking session start.
 */
import { detachSelf, detachedPayload, isDetachedChild } from '../../../lib/hook-detach.js';
import { appendHookDiagnostic } from '../../../lib/hook-diagnostic.js';
import { findRepoRoot, repoPaths } from '../../../lib/paths.js';
import { runProposalDrain } from '../../../lib/proposal-drain.js';
import { readStdin } from '../../../lib/stdin.js';
import { runHeadlessCopilot } from '../headless.js';
import { buildCopilotHarnessOpts } from '../opts.js';

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
      appendHookDiagnostic('copilot:kk-proposal-drain', 'parse', err, paths.logsDir);
      input = {};
    }
  }
  const startCwd =
    typeof input.cwd === 'string' && input.cwd.length > 0 ? input.cwd : process.cwd();
  await runProposalDrain({
    binaryName: 'copilot',
    startCwd,
    runner: async (prompt, stdin, schema, opts) => runHeadlessCopilot(prompt, stdin, schema, opts),
    buildHarnessOpts: settings => buildCopilotHarnessOpts(settings, 'proposal'),
    harnessTag: 'copilot:kk-proposal-drain',
  });
}

void main().catch((err: unknown) => {
  try {
    const paths = repoPaths(findRepoRoot(process.cwd()));
    appendHookDiagnostic('copilot:kk-proposal-drain', 'uncaught', err, paths.logsDir);
  } catch {
    // Outside any project / cannot resolve paths — nothing to log to.
  }
  process.exit(0);
});
