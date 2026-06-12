/**
 * sessionStart hook for the Cursor adapter (proposal drain).
 *
 * Drains the proposal queue via `agent -p --output-format json`. Cursor has
 * no async hook support and waits for sessionStart hooks before the first
 * turn (measured: a pending backlog stalled session start by up to the full
 * 30s hook timeout, with Cursor killing the hook mid-LLM-run), so the hook
 * re-spawns itself detached and returns immediately; the drain runs in the
 * background child.
 */
import { detachSelf, detachedPayload, isDetachedChild } from '../../../lib/hook-detach.js';
import { appendHookDiagnostic } from '../../../lib/hook-diagnostic.js';
import { findRepoRoot, repoPaths } from '../../../lib/paths.js';
import { runProposalDrain } from '../../../lib/proposal-drain.js';
import { readStdin } from '../../../lib/stdin.js';
import { runHeadlessCursor } from '../headless.js';
import { buildCursorHarnessOpts } from '../opts.js';

async function main(): Promise<void> {
  if (process.env['KENKEEP_BUILDER_INTERNAL'] === '1') return;

  const raw = isDetachedChild() ? detachedPayload() : await readStdin();
  if (!isDetachedChild() && detachSelf(raw)) return;
  let input: { workspace_roots?: unknown } = {};
  if (raw.trim().length > 0) {
    try {
      input = JSON.parse(raw) as { workspace_roots?: unknown };
    } catch (err) {
      const paths = repoPaths(findRepoRoot(process.cwd()));
      appendHookDiagnostic('cursor:kk-proposal-drain', 'parse', err, paths.logsDir);
      input = {};
    }
  }
  const roots = input.workspace_roots;
  const startCwd =
    Array.isArray(roots) && typeof roots[0] === 'string' && roots[0].length > 0
      ? (roots[0] as string)
      : process.cwd();
  await runProposalDrain({
    binaryName: 'agent',
    startCwd,
    runner: async (prompt, stdin, schema, opts) => runHeadlessCursor(prompt, stdin, schema, opts),
    buildHarnessOpts: settings => buildCursorHarnessOpts(settings, 'proposal'),
    harnessTag: 'cursor:kk-proposal-drain',
  });
}

void main().catch((err: unknown) => {
  try {
    const paths = repoPaths(findRepoRoot(process.cwd()));
    appendHookDiagnostic('cursor:kk-proposal-drain', 'uncaught', err, paths.logsDir);
  } catch {
    // Outside any project / cannot resolve paths — nothing to log to.
  }
  process.exit(0);
});
