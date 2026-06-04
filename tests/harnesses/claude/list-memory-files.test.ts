import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { execa } from 'execa';
import { claudeAdapter } from '../../../src/harnesses/claude/index.js';

vi.mock('execa', () => ({ execa: vi.fn() }));

interface FakeExecaResult {
  exitCode: number;
  failed: boolean;
  timedOut: boolean;
}

interface CapturedCall {
  command?: string;
  args?: readonly string[];
  options?: Record<string, unknown>;
}

function fakeExeca(lines: string[]): {
  result: FakeExecaResult & { stdout: Readable };
} {
  const stdout = Readable.from(lines.map(l => `${l}\n`));
  const result: FakeExecaResult = { exitCode: 0, failed: false, timedOut: false };
  const thenable = Object.assign(Promise.resolve(result), { stdout });
  return { result: thenable as unknown as FakeExecaResult & { stdout: Readable } };
}

function mockExecaOnce(lines: string[]): { captured: CapturedCall } {
  const captured: CapturedCall = {};
  vi.mocked(execa).mockImplementationOnce(((
    command: string,
    args: readonly string[],
    options: Record<string, unknown>
  ) => {
    captured.command = command;
    captured.args = args;
    captured.options = options;
    return fakeExeca(lines).result;
  }) as unknown as typeof execa);
  return { captured };
}

function resultLine(payload: unknown): string {
  return JSON.stringify({
    type: 'result',
    is_error: false,
    result: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

describe("claudeAdapter.listMemoryFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('parses a JSON array of file:// IRIs', async () => {
    const iris = ['file:///home/x/memory_a.md', 'file:///home/x/memory_b.md'];
    mockExecaOnce([resultLine(iris)]);
    const out = await claudeAdapter.listMemoryFiles();
    expect(out).toEqual(iris);
  });

  it('returns [] for the empty-array response', async () => {
    mockExecaOnce([resultLine([])]);
    expect(await claudeAdapter.listMemoryFiles()).toEqual([]);
  });

  it('filters out non-file:// entries and warns rather than throwing', async () => {
    mockExecaOnce([
      resultLine(['file:///ok.md', 'https://example.com/bad', 's3://nope.md', 'file:///also.md']),
    ]);
    expect(await claudeAdapter.listMemoryFiles()).toEqual(['file:///ok.md', 'file:///also.md']);
  });

  it('de-duplicates repeated IRIs in the same reply', async () => {
    mockExecaOnce([resultLine(['file:///dup.md', 'file:///dup.md', 'file:///dup.md'])]);
    expect(await claudeAdapter.listMemoryFiles()).toEqual(['file:///dup.md']);
  });

  it('returns [] when the harness reply is not JSON', async () => {
    mockExecaOnce([resultLine('not actually json {')]);
    expect(await claudeAdapter.listMemoryFiles()).toEqual([]);
  });

  it('returns [] when the JSON does not match the string-array schema', async () => {
    mockExecaOnce([resultLine({ unexpected: 'shape' })]);
    expect(await claudeAdapter.listMemoryFiles()).toEqual([]);
  });

  it('returns [] when the headless child fails (does not throw to the caller)', async () => {
    vi.mocked(execa).mockImplementationOnce(((
      _command: string,
      _args: readonly string[],
      _options: Record<string, unknown>
    ) => {
      const stdout = Readable.from([]);
      const result: FakeExecaResult = { exitCode: 1, failed: true, timedOut: false };
      const thenable = Object.assign(Promise.resolve(result), { stdout });
      return thenable as unknown as ReturnType<typeof execa>;
    }) as unknown as typeof execa);
    expect(await claudeAdapter.listMemoryFiles()).toEqual([]);
  });

  it('sets KENKEEP_BUILDER_INTERNAL=1 on the spawned child env', async () => {
    const { captured } = mockExecaOnce([resultLine([])]);
    await claudeAdapter.listMemoryFiles();
    const env = captured.options?.['env'] as NodeJS.ProcessEnv;
    expect(env['KENKEEP_BUILDER_INTERNAL']).toBe('1');
    expect(captured.command).toBe('claude');
    expect(captured.args).toContain('-p');
  });
});
