import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '..');
export const cliPath = join(repoRoot, 'dist/cli.js');

export function makeSandbox(prefix = 'ai-kb-test-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function cleanSandbox(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Spawns the built CLI in `cwd` with the given args. Captures stdout/stderr
 * regardless of exit code (commander uses non-zero exits in some paths).
 */
export async function runCli(cwd: string, args: string[]): Promise<RunResult> {
  try {
    const { stdout, stderr } = await exec('node', [cliPath, ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: typeof e.code === 'number' ? e.code : 1,
    };
  }
}
