/**
 * SessionStart hook (async) for the Codex CLI adapter.
 *
 * Drains the proposal queue by spawning `codex exec --json` for each pending
 * session log. Configured in `.codex/hooks.json` with `async: true` so it
 * never blocks the agent.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendHookDiagnostic } from '../../../lib/hook-diagnostic.js';
import { findRepoRoot, repoPaths } from '../../../lib/paths.js';
import { drainProposalQueue, loadProposalPrompt, type ProposalRunner } from '../../../lib/proposal-drain.js';
import { resolveSettings } from '../../../lib/settings.js';
import { readStdin } from '../../../lib/stdin.js';
import { runHeadlessCodex } from '../headless.js';
import { buildCodexHarnessOpts } from '../opts.js';

const PACKAGE_TAG = '[ai-knowledge-base]';

async function main(): Promise<void> {
  if (process.env['KB_BUILDER_INTERNAL'] === '1') return;

  try {
    execFileSync('which', ['codex'], { stdio: 'ignore' });
  } catch {
    return;
  }

  const raw = await readStdin();
  let input: { cwd?: unknown } = {};
  if (raw.trim().length > 0) {
    try {
      input = JSON.parse(raw) as { cwd?: unknown };
    } catch (err) {
      const paths = repoPaths(findRepoRoot(process.cwd()));
      appendHookDiagnostic('codex:kb-proposal-drain', 'parse', err, paths.logsDir);
      input = {};
    }
  }
  const startCwd =
    typeof input.cwd === 'string' && input.cwd.length > 0 ? input.cwd : process.cwd();
  const root = findRepoRoot(startCwd);
  const paths = repoPaths(root);
  if (!existsSync(paths.installedVersionFile)) return;

  const promptTemplate = loadProposalPrompt(paths.promptsDir);
  if (!promptTemplate) {
    process.stderr.write(`${PACKAGE_TAG} proposal prompt template not found; skipping drain\n`);
    return;
  }

  const runner: ProposalRunner = async (prompt, stdin, schema, opts) =>
    runHeadlessCodex(prompt, stdin, schema, opts);

  try {
    process.stderr.write('🔄 KB Proposals: Draining queue…\n');
    const { settings } = resolveSettings({ projectFile: paths.projectConfigFile });
    const summary = await drainProposalQueue({
      paths,
      promptTemplate,
      runner,
      harnessOpts: buildCodexHarnessOpts(settings, 'proposal'),
    });
    if (summary.status === 'locked') {
      process.stderr.write('🔒 KB Proposals: Drain already in progress.\n');
      return;
    }
    const failed = summary.processed.filter(p => p.status === 'failed');
    if (failed.length > 0) {
      process.stderr.write(
        `${PACKAGE_TAG} proposal drain: ${failed.length} session(s) failed; see _logs/proposal/\n`
      );
    }
    process.stderr.write('📬 KB Proposals: Queue drained.\n');
  } catch (err) {
    process.stderr.write(
      `${PACKAGE_TAG} proposal drain error: ${err instanceof Error ? err.message : String(err)}\n`
    );
  }
}


void main().catch((err: unknown) => {
  try {
    const paths = repoPaths(findRepoRoot(process.cwd()));
    appendHookDiagnostic('codex:kb-proposal-drain', 'uncaught', err, paths.logsDir);
  } catch {
    // Outside any project / cannot resolve paths — nothing to log to.
  }
  process.exit(0);
});
