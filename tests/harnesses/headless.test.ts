import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { getHarness } from '../../src/harnesses/registry.js';
import { mockExecaOnce } from '../helpers/execa-mock.js';

vi.mock('execa', () => ({ execa: vi.fn() }));

const Schema = z.object({ ok: z.boolean(), n: z.number() });

/**
 * The execa-backed adapters share a uniform contract: they spawn a child,
 * parse a terminal event into JSON, validate it against the caller's Zod
 * schema, force the recursion-guard env var, and throw when the child
 * produces no terminal result. Each adapter serializes those events
 * differently, so the per-harness `success`/`noResult` builders translate a
 * payload into that adapter's native stdout stream.
 *
 * Copilot is excluded: it has no `--json` stream and the runner buffers
 * stdout from a real child, so it is exercised with a Node shim below.
 */
const execaHeadlessCases: Array<{
  id: string;
  success: (payload: unknown) => string[];
  noResult: string[];
}> = [
  {
    id: 'claude',
    success: payload => [
      JSON.stringify({ type: 'system', subtype: 'init' }),
      JSON.stringify({ type: 'result', is_error: false, result: JSON.stringify(payload) }),
    ],
    noResult: [JSON.stringify({ type: 'assistant', message: { content: 'hi' } })],
  },
  {
    id: 'codex',
    success: payload => [
      JSON.stringify({ type: 'thread.started' }),
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'agent_message', text: JSON.stringify(payload) },
      }),
    ],
    noResult: [JSON.stringify({ type: 'thread.started' })],
  },
  {
    id: 'cursor',
    success: payload => [
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: JSON.stringify(payload),
      }),
    ],
    noResult: [JSON.stringify({ type: 'system', subtype: 'init' })],
  },
  {
    id: 'opencode',
    success: payload => [
      JSON.stringify({
        type: 'message.part.updated',
        properties: { messageID: 'm', part: { type: 'text', text: JSON.stringify(payload) } },
      }),
      JSON.stringify({ type: 'session.idle' }),
    ],
    noResult: [JSON.stringify({ type: 'session.idle' })],
  },
];

describe('adapter.runHeadless (parametrized over execa-backed harnesses)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(execaHeadlessCases)(
    '$id parses the terminal result, validates against the schema, and forces the recursion guard',
    async ({ id, success }) => {
      const { captured } = mockExecaOnce(success({ ok: true, n: 42 }));
      const out = await getHarness(id).runHeadless('prompt body', '', Schema);
      expect(out).toEqual({ ok: true, n: 42 });
      const env = captured.options?.['env'] as NodeJS.ProcessEnv;
      expect(env['KENKEEP_BUILDER_INTERNAL']).toBe('1');
    }
  );

  it.each(execaHeadlessCases)(
    '$id throws when the child produces no terminal result event',
    async ({ id, noResult }) => {
      mockExecaOnce(noResult);
      await expect(getHarness(id).runHeadless('prompt body', '', Schema)).rejects.toThrow();
    }
  );
});

describe('claude headless option mapping and error handling', () => {
  const claude = getHarness('claude');
  afterEach(() => vi.clearAllMocks());

  function resultLine(payload: unknown): string {
    return JSON.stringify({ type: 'result', is_error: false, result: JSON.stringify(payload) });
  }

  it('passes -p argv, allowedTools, stdin input, and merges extra env', async () => {
    const { captured } = mockExecaOnce([resultLine({ ok: true, n: 1 })]);
    await claude.runHeadless('hello prompt', 'stdin', Schema, {
      harnessOpts: { allowedTools: ['Read'] },
      env: { FOO: 'bar' },
    });
    const env = captured.options?.['env'] as NodeJS.ProcessEnv;
    expect(env['FOO']).toBe('bar');
    expect(captured.command).toBe('claude');
    expect(captured.args).toEqual([
      '-p',
      'hello prompt',
      '--allowedTools',
      'Read',
      '--output-format',
      'stream-json',
      '--verbose',
    ]);
    expect(captured.options?.['input']).toBe('stdin');
  });

  it('appends --model and --effort only when set', async () => {
    const both = mockExecaOnce([resultLine({ ok: true, n: 1 })]);
    await claude.runHeadless('p', '', Schema, { harnessOpts: { model: 'haiku', effort: 'low' } });
    expect(both.captured.args).toContain('--model');
    expect(both.captured.args).toContain('haiku');
    expect(both.captured.args).toContain('--effort');
    expect(both.captured.args).toContain('low');

    const neither = mockExecaOnce([resultLine({ ok: true, n: 1 })]);
    await claude.runHeadless('p', '', Schema);
    expect(neither.captured.args).not.toContain('--model');
    expect(neither.captured.args).not.toContain('--effort');
  });

  it('unwraps a fenced JSON block and extracts a trailing JSON object from prose', async () => {
    mockExecaOnce([
      JSON.stringify({ type: 'result', is_error: false, result: '```json\n{"ok": true, "n": 7}\n```' }),
    ]);
    expect(await claude.runHeadless('p', '', Schema)).toEqual({ ok: true, n: 7 });

    mockExecaOnce([
      JSON.stringify({
        type: 'result',
        is_error: false,
        result: 'Here is the answer:\n{"ok": true, "n": 9}',
      }),
    ]);
    expect(await claude.runHeadless('p', '', Schema)).toEqual({ ok: true, n: 9 });
  });

  it('throws on non-zero exit, timeout, error-flagged result, and schema mismatch', async () => {
    mockExecaOnce([], { exitCode: 1 });
    await expect(claude.runHeadless('p', '', Schema)).rejects.toThrow(/exit code/);

    mockExecaOnce([], { timedOut: true });
    await expect(claude.runHeadless('p', '', Schema)).rejects.toThrow(/timed out/);

    mockExecaOnce([JSON.stringify({ type: 'result', is_error: true, result: 'oops' })]);
    await expect(claude.runHeadless('p', '', Schema)).rejects.toThrow();

    mockExecaOnce([resultLine({ ok: 'yes please' })]);
    await expect(claude.runHeadless('p', '', Schema)).rejects.toThrow(/schema/);
  });

  it('uses the role option in parse-failure and schema-validation messages', async () => {
    mockExecaOnce([JSON.stringify({ type: 'result', is_error: false, result: '{"oops":' })]);
    await expect(claude.runHeadless('p', '', Schema, { role: 'curator' })).rejects.toThrow(
      /^curator output was not valid JSON:/
    );

    mockExecaOnce([resultLine({ ok: 'yes please' })]);
    await expect(claude.runHeadless('p', '', Schema, { role: 'proposal' })).rejects.toThrow(
      /^proposal output did not match schema:/
    );
  });

  it('references the log path in the parse-failure message and stays single-line', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kk-headless-'));
    try {
      const broken = '{"action":"add","body":"This is broken\n   no closing quote';
      mockExecaOnce([JSON.stringify({ type: 'result', is_error: false, result: broken })]);
      const logFile = join(dir, 'logs', 'curator', 'bad.jsonl');
      let caught: Error | null = null;
      try {
        await claude.runHeadless('p', '', Schema, { logFile });
      } catch (err) {
        caught = err as Error;
      }
      expect(caught).not.toBeNull();
      const msg = caught!.message;
      expect(msg).toMatch(/^headless output was not valid JSON:/);
      expect(msg).toContain(logFile);
      expect(msg).toContain('for the full transcript.');
      expect(msg).not.toContain('\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('invokes onMessage for every parsed stream-json line and mirrors raw stream to logFile', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kk-headless-'));
    try {
      mockExecaOnce([
        JSON.stringify({ type: 'system', subtype: 'init' }),
        JSON.stringify({ type: 'assistant', message: { content: 'hi' } }),
        resultLine({ ok: true, n: 5 }),
      ]);
      const seen: Array<string | undefined> = [];
      const logFile = join(dir, 'logs', 'proposal', 'a.jsonl');
      await claude.runHeadless('p', '', Schema, { onMessage: msg => seen.push(msg.type), logFile });
      expect(seen).toEqual(['system', 'assistant', 'result']);
      const lines = readFileSync(logFile, 'utf8').trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[2]!).type).toBe('result');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('codex headless option mapping and error handling', () => {
  const codex = getHarness('codex');
  afterEach(() => vi.clearAllMocks());

  function agentMessage(payload: unknown): string[] {
    return [
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'agent_message', text: JSON.stringify(payload) },
      }),
    ];
  }

  it('uses positional argv for short prompts and stdin only when stdin is non-empty', async () => {
    const shortRun = mockExecaOnce(agentMessage({ ok: true, n: 1 }));
    await codex.runHeadless('hello', '', Schema);
    expect(shortRun.captured.command).toBe('codex');
    expect(shortRun.captured.args).toContain('exec');
    expect(shortRun.captured.args).toContain('--json');
    expect(shortRun.captured.args).toContain('--sandbox');
    expect(shortRun.captured.args).toContain('read-only');
    expect(shortRun.captured.args).toContain('hello');
    expect(shortRun.captured.args).not.toContain('-');
    expect(shortRun.captured.options?.['input']).toBe('');

    const stdinRun = mockExecaOnce(agentMessage({ ok: true, n: 2 }));
    await codex.runHeadless('hello', 'extra stdin payload', Schema);
    expect(stdinRun.captured.args).toContain('-');
    expect(stdinRun.captured.options?.['input']).toBe('extra stdin payload');
  });

  it('honors harnessOpts.model and harnessOpts.reasoningEffort and merges extra env', async () => {
    const { captured } = mockExecaOnce(agentMessage({ ok: true, n: 1 }));
    await codex.runHeadless('p', '', Schema, {
      harnessOpts: { model: 'gpt-5-codex', reasoningEffort: 'high' },
      env: { FOO: 'bar' },
    });
    const args = captured.args ?? [];
    expect(args).toContain('--model');
    expect(args).toContain('gpt-5-codex');
    expect(args).toContain('-c');
    expect(args).toContain('reasoning.effort=high');
    expect((captured.options?.['env'] as NodeJS.ProcessEnv)['FOO']).toBe('bar');
  });

  it('invokes onMessage for every parsed stream event', async () => {
    mockExecaOnce([
      JSON.stringify({ type: 'thread.started' }),
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'agent_message', text: JSON.stringify({ ok: true, n: 5 }) },
      }),
      JSON.stringify({ type: 'turn.completed' }),
    ]);
    const seen: Array<string | undefined> = [];
    await codex.runHeadless('p', '', Schema, {
      onMessage: msg => seen.push(msg['type'] as string | undefined),
    });
    expect(seen).toEqual(['thread.started', 'turn.started', 'item.completed', 'turn.completed']);
  });

  it('throws on non-zero exit (with stderr tail), timeout, missing agent_message, and bad JSON/schema', async () => {
    mockExecaOnce([], { exitCode: 1, stderr: 'codex: something went wrong' });
    await expect(codex.runHeadless('p', '', Schema)).rejects.toThrow(
      /exit code 1.*codex: something went wrong/s
    );

    mockExecaOnce([], { timedOut: true });
    await expect(codex.runHeadless('p', '', Schema)).rejects.toThrow(/timed out/);

    mockExecaOnce([JSON.stringify({ type: 'thread.started' })]);
    await expect(codex.runHeadless('p', '', Schema)).rejects.toThrow(/no agent_message/);

    mockExecaOnce([
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: '{"oops":' } }),
    ]);
    await expect(codex.runHeadless('p', '', Schema)).rejects.toThrow(
      /headless output was not valid JSON/
    );

    mockExecaOnce(agentMessage({ ok: 'yes' }));
    await expect(codex.runHeadless('p', '', Schema)).rejects.toThrow(/schema/);
  });
});

describe('opencode headless option mapping and error handling', () => {
  const opencode = getHarness('opencode');
  afterEach(() => vi.clearAllMocks());

  it('passes --model and --agent in the canonical argv order', async () => {
    const { captured } = mockExecaOnce([
      JSON.stringify({
        type: 'message.part.updated',
        properties: { messageID: 'm', part: { type: 'text', text: '{"ok":true,"n":1}' } },
      }),
      JSON.stringify({ type: 'session.idle' }),
    ]);
    await opencode.runHeadless('hello', '', Schema, {
      harnessOpts: { model: 'anthropic/claude-sonnet-4', agent: 'build' },
    });
    expect(captured.command).toBe('opencode');
    expect(captured.args).toEqual([
      'run',
      '--format',
      'json',
      '--model',
      'anthropic/claude-sonnet-4',
      '--agent',
      'build',
      'hello',
    ]);
  });

  it('accumulates text deltas and resets the accumulator on a new message id', async () => {
    mockExecaOnce([
      JSON.stringify({ type: 'session.created' }),
      JSON.stringify({
        type: 'message.part.updated',
        properties: { messageID: 'm1', part: { type: 'text', text: 'stale' } },
      }),
      JSON.stringify({
        type: 'message.part.updated',
        properties: { messageID: 'm2', part: { type: 'text', text: '{"ok":' } },
      }),
      JSON.stringify({
        type: 'message.part.updated',
        properties: { messageID: 'm2', part: { type: 'text', text: 'true,"n":42}' } },
      }),
      JSON.stringify({ type: 'session.idle' }),
    ]);
    expect(await opencode.runHeadless('hello', '', Schema)).toEqual({ ok: true, n: 42 });
  });

  it('throws on non-zero exit and on accumulated text that is not valid JSON', async () => {
    mockExecaOnce([JSON.stringify({ type: 'session.idle' })], { exitCode: 1, stderr: 'boom' });
    await expect(opencode.runHeadless('hello', '', Schema)).rejects.toThrow(
      /opencode subprocess failed/
    );

    mockExecaOnce([
      JSON.stringify({
        type: 'message.part.updated',
        properties: { messageID: 'm', part: { type: 'text', text: 'not json at all' } },
      }),
      JSON.stringify({ type: 'session.idle' }),
    ]);
    await expect(opencode.runHeadless('hello', '', Schema)).rejects.toThrow(
      /headless output was not valid JSON/
    );
  });
});

describe('cursor headless option mapping', () => {
  const cursor = getHarness('cursor');
  afterEach(() => vi.clearAllMocks());

  it('honors agentCli override and passes the documented flags', async () => {
    const { captured } = mockExecaOnce([
      JSON.stringify({ type: 'result', subtype: 'success', result: JSON.stringify({ ok: true, n: 1 }) }),
    ]);
    await cursor.runHeadless('prompt', '', Schema, { harnessOpts: { agentCli: '/tmp/fake-agent' } });
    expect(captured.command).toBe('/tmp/fake-agent');
    expect(captured.args).toContain('-p');
    expect(captured.args).toContain('--output-format');
  });
});
