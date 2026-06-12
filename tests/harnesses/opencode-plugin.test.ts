import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanSandbox, makeSandbox, runCli } from '../helpers.js';
import { normalizeOpenCodeSessionId } from '../../src/harnesses/opencode/session-id.js';

const exec = promisify(execFile);

const RAW_SESS = 'ses_0a1b2c3d4e5f60718293a4b5c6d7e8f9';
const NORMALIZED_SESS = normalizeOpenCodeSessionId(RAW_SESS);
const SUBSTANTIAL_USER = 'use bravo_pii.cache for PII. '.repeat(8);
const SUBSTANTIAL_AGENT = 'understood, here is the detailed reasoning. '.repeat(16);

interface PluginHooks {
  event?: (args: {
    event: { type?: string; properties?: { sessionID?: string } };
  }) => Promise<void>;
}

type PluginFactory = (input: { directory?: string }) => Promise<PluginHooks>;

function writeOpenCodeStub(dir: string): string {
  const binDir = join(dir, 'bin');
  mkdirSync(binDir, { recursive: true });
  const doc = {
    info: { id: RAW_SESS },
    messages: [
      {
        info: { role: 'user', time: { created: 1 } },
        parts: [{ type: 'text', text: SUBSTANTIAL_USER }],
      },
      {
        info: { role: 'assistant', time: { created: 2 } },
        parts: [{ type: 'text', text: SUBSTANTIAL_AGENT }],
      },
    ],
  };
  writeFileSync(join(dir, 'oc-export.json'), JSON.stringify(doc));
  const script = [
    '#!/bin/sh',
    'DIR=$(dirname "$0")',
    'if [ "$1" = "--version" ]; then echo 1.17.3; exit 0; fi',
    'if [ "$1" = "export" ]; then cat "$DIR/../oc-export.json"; exit 0; fi',
    'exit 1',
    '',
  ].join('\n');
  writeFileSync(join(binDir, 'opencode'), script, { mode: 0o755 });
  return binDir;
}

function sessionLogs(sandbox: string): string[] {
  const sessionsDir = join(sandbox, '.ai/kenkeep/_sessions');
  if (!existsSync(sessionsDir)) return [];
  return readdirSync(sessionsDir).filter(f => f.endsWith('.md'));
}

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return predicate();
}

/**
 * End-to-end test of the production OpenCode wiring: the installed plugin
 * (`.opencode/plugins/kk.mjs`) dispatching a `session.idle` event into the
 * installed `kk-capture.cjs`, which shells out to the stubbed `opencode
 * export` and writes a session log. This is the chain a live OpenCode
 * session exercises; the per-hook suites bypass the plugin entirely.
 */
describe('opencode plugin dispatch (installed artifacts)', () => {
  let sandbox: string;
  let stubDir: string;
  const savedPath = process.env['PATH'];
  const savedGuard = process.env['KENKEEP_BUILDER_INTERNAL'];

  beforeEach(async () => {
    sandbox = makeSandbox();
    stubDir = makeSandbox('ai-kk-opencode-plugin-stub-');
    await exec('git', ['init', '-q'], { cwd: sandbox });
    await runCli(sandbox, ['init', '--harnesses', 'opencode']);
    const binDir = writeOpenCodeStub(stubDir);
    process.env['PATH'] = `${binDir}:${savedPath ?? ''}`;
    delete process.env['KENKEEP_BUILDER_INTERNAL'];
  });

  afterEach(() => {
    process.env['PATH'] = savedPath;
    if (savedGuard === undefined) delete process.env['KENKEEP_BUILDER_INTERNAL'];
    else process.env['KENKEEP_BUILDER_INTERNAL'] = savedGuard;
    cleanSandbox(sandbox);
    cleanSandbox(stubDir);
  });

  it('session.idle reaches kk-capture and a session log lands in _sessions/', async () => {
    const pluginPath = join(sandbox, '.opencode', 'plugins', 'kk.mjs');
    expect(existsSync(pluginPath)).toBe(true);

    const mod = (await import(pathToFileURL(pluginPath).href)) as { default: PluginFactory };
    const hooks = await mod.default({ directory: sandbox });
    expect(typeof hooks.event).toBe('function');

    await hooks.event!({ event: { type: 'session.idle', properties: { sessionID: RAW_SESS } } });

    // The plugin spawns the hook fire-and-forget; poll for the capture result.
    const appeared = await waitFor(() => sessionLogs(sandbox).length > 0, 15_000);
    expect(appeared).toBe(true);

    const log = readFileSync(
      join(sandbox, '.ai/kenkeep/_sessions', sessionLogs(sandbox)[0] as string),
      'utf8'
    );
    expect(log).toContain(`session_id: ${NORMALIZED_SESS}`);
    expect(log).toContain('captured_by: stop');
    expect(log).toContain('proposal_status: pending');
  }, 30_000);

  it('no-ops inside a kenkeep-internal session (host env guard)', async () => {
    const pluginPath = join(sandbox, '.opencode', 'plugins', 'kk.mjs');
    process.env['KENKEEP_BUILDER_INTERNAL'] = '1';
    // Cache-bust the module so the import re-evaluates under the guard env.
    const mod = (await import(`${pathToFileURL(pluginPath).href}?guard=1`)) as {
      default: PluginFactory;
    };
    const hooks = await mod.default({ directory: sandbox });
    expect(hooks.event).toBeUndefined();
  });
});
