import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import {
  previewBootstrapIncremental,
  runBootstrapIncremental,
  type BootstrapContext,
  type BootstrapRunner,
} from '../lib/bootstrap.js';
import { resolveActiveHarness } from '../harnesses/detect.js';
import type { HeadlessRunOptions } from '../harnesses/types.js';
import { log } from '../lib/log.js';
import { discoverHarnessMemoryFiles } from '../lib/memory-files.js';
import { findRepoRoot, packageTemplatesDir, repoPaths } from '../lib/paths.js';
import { resolveSettings } from '../lib/settings.js';

export interface BootstrapIncrementalOptions {
  dryRun?: boolean | undefined;
  yes?: boolean | undefined;
  timeoutMs?: number | undefined;
  harness?: string | undefined;
}

export async function runBootstrapIncrementalCommand(
  opts: BootstrapIncrementalOptions
): Promise<number> {
  const root = findRepoRoot();
  const paths = repoPaths(root);

  if (!existsSync(paths.installedVersionFile)) {
    log.error(
      'ai-knowledge-base is not initialized in this repo. Run `npx @e0ipso/ai-knowledge-base init --harnesses claude`.'
    );
    return 1;
  }

  const promptTemplate = loadBootstrapPrompt(paths.promptsDir);
  if (!promptTemplate) {
    log.error('Bootstrap-incremental prompt template not found.');
    return 1;
  }

  const { settings } = resolveSettings({ projectFile: paths.projectConfigFile });
  const harness = resolveActiveHarness({
    ...(opts.harness !== undefined ? { flag: opts.harness } : {}),
    ...(settings.cliDefaultHarness !== undefined ? { cliDefault: settings.cliDefaultHarness } : {}),
  });
  const runner: BootstrapRunner = (prompt, stdin, schema, runnerOpts) =>
    harness.runHeadless(prompt, stdin, schema, runnerOpts as HeadlessRunOptions);

  const memory = await discoverHarnessMemoryFiles({ adapter: harness, paths });
  if (memory.bootstrapCandidates.length > 0) {
    log.info(
      `Including ${memory.bootstrapCandidates.length} harness memory file(s) in the bootstrap input set.`
    );
  }

  const ctx: BootstrapContext = {
    paths,
    promptTemplate,
    runner,
    harnessOpts: harness.buildHarnessOpts(settings, 'bootstrap'),
    memoryCandidates: memory.bootstrapCandidates,
    ...(opts.dryRun ? { dryRun: true } : {}),
    ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
  };

  const preview = previewBootstrapIncremental(ctx);
  const memoryCount = memory.bootstrapCandidates.length;

  // Empty-set diagnostic: no markdown survived the filter chain AND no
  // memory candidates exist. The diagnostic is a command-layer concern; the
  // lib only surfaces the raw `scannedBeforeFilter` count needed to choose
  // between the two variants.
  if (preview.discoveredMarkdown === 0 && memoryCount === 0) {
    const kbignorePath = join(paths.root, '.kbignore');
    if (preview.scannedBeforeFilter > 0) {
      log.warn(
        `Scanned ${preview.scannedBeforeFilter} markdown file(s); 0 survived .kbignore + .gitignore filters. Check patterns in ${kbignorePath}.`
      );
    } else {
      log.warn(
        `No markdown files found under ${paths.root}. Check that you are running from a project containing .md files.`
      );
    }
    return 0;
  }

  // Confirmation gate. Sorted posix paths so the list the user sees is the
  // exact set the runner will process. The gate only runs when there is
  // actual work to do; if every file is unchanged we fall through directly
  // to the runner which returns a no-op `completed` result.
  const listPaths = preview.candidates.map(c => c.relPath).sort();
  if (preview.candidates.length > 0) {
    if (opts.dryRun) {
      // Dry-runs intentionally skip the gate; nothing destructive happens.
      printCandidates(listPaths);
    } else if (opts.yes) {
      printCandidates(listPaths);
    } else if (process.stdin.isTTY && process.stdout.isTTY) {
      printCandidates(listPaths);
      const proceed = await promptYesNo('Proceed? [y/N] ');
      if (!proceed) {
        log.plain('Aborted; no changes made.');
        return 0;
      }
    } else {
      log.error('Refusing to run non-interactively without --yes. Re-run with --yes to confirm.');
      return 2;
    }
  }

  log.info(
    opts.dryRun
      ? `Bootstrap incremental (dry-run) scanning ${paths.root}…`
      : `Bootstrap incremental processing ${paths.root}…`
  );

  const commitRunId = randomUUID();
  let memoryCommitted = false;
  let result;
  try {
    result = await runBootstrapIncremental({ ...ctx, preview });
  } catch (err) {
    await memory.commit(commitRunId, false);
    memoryCommitted = true;
    throw err;
  }
  if (!memoryCommitted) {
    // Dry-runs and locked runs do not durably persist anything; only commit
    // the ledger when the pipeline actually wrote nodes.
    const succeeded = !opts.dryRun && result.status === 'completed';
    await memory.commit(commitRunId, succeeded);
  }

  switch (result.status) {
    case 'locked':
      log.warn(`Bootstrap is locked: ${result.reason ?? 'another run holds the lock'}.`);
      return 0;
    case 'no-docs':
      log.success(`No markdown files matched under ${paths.root}.`);
      return 0;
    case 'completed': {
      const toProcess = result.processed.filter(p => p.status !== 'unchanged').length;
      if (opts.dryRun) {
        log.success(
          `Dry-run: ${toProcess} file(s) would be processed in ${result.batches} batch(es); ${result.unchanged} unchanged.`
        );
        for (const p of result.processed) {
          if (p.status === 'skipped-dry-run') log.plain(`  + ${p.relPath}`);
        }
        return 0;
      }
      log.success(
        `Bootstrap finished: ${result.nodesWritten} node(s) written across ${result.batches} batch(es); ` +
          `${toProcess} processed, ${result.unchanged} unchanged` +
          (result.skippedCollisions > 0
            ? `, ${result.skippedCollisions} skipped (target node already exists)`
            : '') +
          '.'
      );
      log.plain(`Run id: ${result.runId}`);
      const failures = result.processed.filter(p => p.status === 'failed');
      if (failures.length > 0) {
        log.warn(`${failures.length} file(s) failed to process; see logs for details.`);
        for (const f of failures) log.plain(`  ! ${f.relPath}: ${f.error ?? 'unknown error'}`);
      }
      log.plain('Review new nodes with `git diff nodes/` before committing.');
      return 0;
    }
  }
}

function printCandidates(listPaths: string[]): void {
  log.plain(`Found ${listPaths.length} file(s) to process:`);
  for (const rel of listPaths) log.plain(`  ${rel}`);
}

/**
 * Reads a single line from `input`, writes `question` to `output`, and
 * resolves true iff the response is `y` / `yes` (case-insensitive). The
 * readline interface is closed on every code path so the caller does not
 * leak the listener and so the process can exit cleanly after an abort.
 *
 * Exported for tests; the production gate calls this with
 * `process.stdin` / `process.stdout`.
 */
export function promptYesNo(
  question: string,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout
): Promise<boolean> {
  return new Promise(resolve => {
    const rl = createInterface({ input, output });
    rl.question(question, answer => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

function loadBootstrapPrompt(promptsDir: string): string | null {
  const local = join(promptsDir, 'bootstrap-incremental.md');
  if (existsSync(local)) return readFileSync(local, 'utf8');
  const fallback = join(packageTemplatesDir(), 'prompts', 'bootstrap-incremental.md');
  if (existsSync(fallback)) return readFileSync(fallback, 'utf8');
  return null;
}

