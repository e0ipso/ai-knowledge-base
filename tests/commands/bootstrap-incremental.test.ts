import { execFile, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promptYesNo } from '../../src/commands/bootstrap-incremental.js';
import { previewBootstrapIncremental } from '../../src/lib/bootstrap.js';
import { repoPaths } from '../../src/lib/paths.js';
import { cliPath, makeSandbox, cleanSandbox } from '../helpers.js';

const exec = promisify(execFile);

interface RunOptions {
  stdinData?: string;
  /**
   * When true, runs the CLI inside a tiny wrapper script that forces
   * `process.stdin.isTTY` / `process.stdout.isTTY` to true before requiring
   * the CLI entry. Lets the suite exercise the interactive prompt path
   * without a real PTY.
   */
  forceTty?: boolean;
}

interface RunOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Spawns the built CLI in `cwd`, optionally piping stdin and optionally
 * forcing the TTY flags on. Returns stdout / stderr / exit code regardless
 * of exit status.
 */
function runCli(cwd: string, args: string[], opts: RunOptions = {}): Promise<RunOutput> {
  let nodeArgs: string[];
  if (opts.forceTty) {
    // Node strips `-e` and the `--` separator from argv, so commander would
    // not see the subcommand without help. Rewrite process.argv inside the
    // wrapper to the shape the real CLI entry expects: [node, cliPath, ...args].
    const wrapper = `
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
      process.argv = [process.argv[0], ${JSON.stringify(cliPath)}, ...${JSON.stringify(args)}];
      await import(${JSON.stringify(cliPath)});
    `;
    nodeArgs = ['--input-type=module', '-e', wrapper];
  } else {
    nodeArgs = [cliPath, ...args];
  }
  return new Promise(resolve => {
    const child = spawn('node', nodeArgs, {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b: Buffer) => (stdout += b.toString('utf8')));
    child.stderr.on('data', (b: Buffer) => (stderr += b.toString('utf8')));
    if (opts.stdinData !== undefined) {
      child.stdin.write(opts.stdinData);
    }
    child.stdin.end();
    child.on('close', code => {
      resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : 1 });
    });
  });
}

/**
 * Builds a sandbox with `init` already applied so bootstrap-incremental can
 * find the installed-version marker, prompt template, and `.kbignore`.
 */
async function makeInitializedSandbox(): Promise<string> {
  const sandbox = makeSandbox('kb-bootstrap-cmd-');
  await promisify(execFile)('git', ['init', '-q'], { cwd: sandbox });
  // Use codex (whose `listMemoryFiles` is a no-op `[]`) so the bootstrap
  // command does not spawn a real `claude` subprocess for memory discovery
  // during these tests.
  await exec('node', [cliPath, 'init', '--harnesses', 'codex'], {
    cwd: sandbox,
    env: { ...process.env, NO_COLOR: '1' },
  });
  return sandbox;
}

describe('bootstrap-incremental command', () => {
  let sandbox: string;
  beforeEach(async () => {
    sandbox = await makeInitializedSandbox();
  });
  afterEach(() => cleanSandbox(sandbox));

  describe('empty-set diagnostics', () => {
    it('reports the "no markdown files" variant when scannedBeforeFilter is 0', async () => {
      // Exclude everything so the walker descends into nothing markdown-like.
      // STATIC_SKIPS strips `.ai/` already (via no auto-skip), but `init`
      // populates `.ai/knowledge-base/...` with `.md` files we need to mask
      // out, plus the README at the KB root.
      // Exclude all harness instruction directories + the KB tree so only
      // the markdown files we explicitly write at the sandbox root show up.
      writeFileSync(join(sandbox, '.kbignore'), '.ai/\n.agents/\n.codex/\n');
      // No top-level .md files; sandbox is otherwise empty.
      const result = await runCli(sandbox, ['--harness', 'codex', 'bootstrap-incremental', '--yes']);
      expect(result.exitCode).toBe(0);
      // log.warn writes to stderr.
      expect(result.stderr).toMatch(/No markdown files found under/);
      expect(result.stderr).toContain('Check that you are running from a project containing .md files.');
    }, 30000);

    it('reports the "0 survived filters" variant when every md file is ignored', async () => {
      writeFileSync(join(sandbox, '.kbignore'), '.ai/\n.agents/\n.codex/\ndoc.md\n');
      writeFileSync(join(sandbox, 'doc.md'), '# doc');
      const result = await runCli(sandbox, ['--harness', 'codex', 'bootstrap-incremental', '--yes']);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toMatch(/Scanned 1 markdown file\(s\); 0 survived \.kbignore \+ \.gitignore filters\./);
      expect(result.stderr).toContain('.kbignore');
    }, 30000);
  });

  describe('--dry-run', () => {
    it('skips the confirmation prompt and prints the candidate list', async () => {
      // The default `.kbignore` does not exclude `.ai/` (which init populates
      // with prompt templates and a KB README). Force a narrow scope so the
      // candidate list is deterministic.
      // Exclude all harness instruction directories + the KB tree so only
      // the markdown files we explicitly write at the sandbox root show up.
      writeFileSync(join(sandbox, '.kbignore'), '.ai/\n.agents/\n.codex/\n');
      writeFileSync(join(sandbox, 'README.md'), '# Project\n\nIntro.');
      const result = await runCli(sandbox, ['--harness', 'codex', 'bootstrap-incremental', '--dry-run']);
      expect(result.exitCode).toBe(0);
      // Gate header printed.
      expect(result.stdout).toContain('Found 1 file(s) to process:');
      expect(result.stdout).toContain('  README.md');
      // No prompt was emitted.
      expect(result.stdout).not.toContain('Proceed?');
      // Dry-run success line is from the lib runner.
      expect(result.stdout).toMatch(/Dry-run: 1 file\(s\) would be processed/);
    });
  });

  describe('--yes', () => {
    it('skips the prompt under --yes even with --dry-run', async () => {
      // Exclude all harness instruction directories + the KB tree so only
      // the markdown files we explicitly write at the sandbox root show up.
      writeFileSync(join(sandbox, '.kbignore'), '.ai/\n.agents/\n.codex/\n');
      writeFileSync(join(sandbox, 'guide.md'), '# Guide');
      const result = await runCli(sandbox, ['--harness', 'codex', 'bootstrap-incremental', '--yes', '--dry-run']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Found 1 file(s) to process:');
      expect(result.stdout).not.toContain('Proceed?');
    });
  });

  describe('non-TTY abort', () => {
    it('exits 2 with the documented message when stdin is not a TTY and --yes is absent', async () => {
      // Exclude all harness instruction directories + the KB tree so only
      // the markdown files we explicitly write at the sandbox root show up.
      writeFileSync(join(sandbox, '.kbignore'), '.ai/\n.agents/\n.codex/\n');
      writeFileSync(join(sandbox, 'guide.md'), '# Guide');
      const result = await runCli(sandbox, ['--harness', 'codex', 'bootstrap-incremental']);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('Refusing to run non-interactively without --yes. Re-run with --yes to confirm.');
    });
  });

  describe('TTY confirmation', () => {
    it('exits 0 with "Aborted; no changes made." when the user answers anything other than y', async () => {
      // Exclude all harness instruction directories + the KB tree so only
      // the markdown files we explicitly write at the sandbox root show up.
      writeFileSync(join(sandbox, '.kbignore'), '.ai/\n.agents/\n.codex/\n');
      writeFileSync(join(sandbox, 'guide.md'), '# Guide');
      const result = await runCli(sandbox, ['--harness', 'codex', 'bootstrap-incremental'], {
        forceTty: true,
        stdinData: 'n\n',
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Proceed? [y/N]');
      expect(result.stdout).toContain('Aborted; no changes made.');
    });

  });
});

describe('promptYesNo', () => {
  function streams(answer: string): { input: PassThrough; output: PassThrough } {
    const input = new PassThrough();
    const output = new PassThrough();
    // Drain output so the readline write does not stall.
    output.resume();
    process.nextTick(() => {
      input.write(answer);
      input.end();
    });
    return { input, output };
  }

  it('resolves true for "y"', async () => {
    const { input, output } = streams('y\n');
    await expect(promptYesNo('? ', input, output)).resolves.toBe(true);
  });

  it('resolves true for "Y"', async () => {
    const { input, output } = streams('Y\n');
    await expect(promptYesNo('? ', input, output)).resolves.toBe(true);
  });

  it('resolves true for "yes" (case-insensitive)', async () => {
    const { input, output } = streams('YES\n');
    await expect(promptYesNo('? ', input, output)).resolves.toBe(true);
  });

  it('resolves false for "n"', async () => {
    const { input, output } = streams('n\n');
    await expect(promptYesNo('? ', input, output)).resolves.toBe(false);
  });

  it('resolves false for an empty line (default N)', async () => {
    const { input, output } = streams('\n');
    await expect(promptYesNo('? ', input, output)).resolves.toBe(false);
  });

  it('resolves false for garbage like "maybe"', async () => {
    const { input, output } = streams('maybe\n');
    await expect(promptYesNo('? ', input, output)).resolves.toBe(false);
  });
});

describe('previewBootstrapIncremental: memory-only candidate set', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'kb-preview-'));
    const paths = repoPaths(root);
    mkdirSync(paths.stateDir, { recursive: true });
    mkdirSync(paths.nodesDir, { recursive: true });
    // Ensure no markdown survives discovery so the only candidates come from
    // the memory side. `.ai/` is excluded via .kbignore; STATIC_SKIPS
    // already drops .git/node_modules.
    writeFileSync(join(root, '.kbignore'), '.ai/\n');
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('returns the memory candidates as the candidate set and reports zero markdown discoveries', () => {
    const paths = repoPaths(root);
    const memoryCandidate = {
      relPath: 'memory://user-role.md',
      absPath: '/synthetic/user-role.md',
      sha256: 'a'.repeat(64),
      content: '# role',
    };
    const preview = previewBootstrapIncremental({
      paths,
      promptTemplate: 'x',
      memoryCandidates: [memoryCandidate],
    });
    expect(preview.discoveredMarkdown).toBe(0);
    expect(preview.scannedBeforeFilter).toBe(0);
    expect(preview.candidates).toEqual([memoryCandidate]);
    // The command-layer guard reads `discoveredMarkdown === 0 && memoryCount === 0`;
    // a non-zero memory count short-circuits the diagnostic and the gate
    // proceeds with the memory entries.
    expect(preview.candidates.length).toBeGreaterThan(0);
  });
});
