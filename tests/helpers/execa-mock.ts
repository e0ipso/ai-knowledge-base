import { Readable } from 'node:stream';
import { vi } from 'vitest';
import { execa } from 'execa';

/**
 * Shared `execa` mocking helpers for the parametrized harness headless
 * tests. The headless runners treat the spawned child as a thenable that
 * resolves to exit-code metadata while exposing `stdout`/`stderr` as live
 * readable streams. These helpers model exactly that contract so the
 * adapters can be exercised without a real binary.
 *
 * The caller must `vi.mock('execa', () => ({ execa: vi.fn() }))` at module
 * scope before importing these helpers' consumers.
 */
export interface FakeExecaResult {
  exitCode: number;
  failed: boolean;
  timedOut: boolean;
}

export interface CapturedCall {
  command?: string;
  args?: readonly string[];
  options?: Record<string, unknown>;
}

export interface FakeExecaOpts {
  exitCode?: number;
  timedOut?: boolean;
  stderr?: string;
}

function fakeExeca(
  stdoutLines: string[],
  opts: FakeExecaOpts = {}
): FakeExecaResult & { stdout: Readable; stderr: Readable } {
  const stdout = Readable.from(stdoutLines.map(l => `${l}\n`));
  const stderr = Readable.from([opts.stderr ?? '']);
  const result: FakeExecaResult = {
    exitCode: opts.exitCode ?? 0,
    failed: opts.exitCode !== undefined && opts.exitCode !== 0,
    timedOut: opts.timedOut === true,
  };
  const thenable = Object.assign(Promise.resolve(result), { stdout, stderr });
  return thenable as unknown as FakeExecaResult & { stdout: Readable; stderr: Readable };
}

/**
 * Installs a one-shot `execa` implementation that emits the given stdout
 * lines and returns the captured command/args/options for assertions.
 */
export function mockExecaOnce(
  stdoutLines: string[],
  opts: FakeExecaOpts = {}
): { captured: CapturedCall } {
  const captured: CapturedCall = {};
  vi.mocked(execa).mockImplementationOnce(((
    command: string,
    args: readonly string[],
    options: Record<string, unknown>
  ) => {
    captured.command = command;
    captured.args = args;
    captured.options = options;
    return fakeExeca(stdoutLines, opts);
  }) as unknown as typeof execa);
  return { captured };
}
