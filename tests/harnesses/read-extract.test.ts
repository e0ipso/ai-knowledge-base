import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  extractClaudeReads,
  extractCodexReads,
  extractCopilotReads,
  extractCursorReads,
  extractOpenCodeReads,
} from '../../src/harnesses/read-extract.js';

describe('extractClaudeReads', () => {
  it('returns file_path of Read tool_use blocks, ignoring other tools and text', () => {
    const text = [
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'reading' },
            { type: 'tool_use', name: 'Read', input: { file_path: '/r/a.md' } },
            { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
          ],
        },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/r/a.md' } }],
        },
      }),
      'not json',
    ].join('\n');
    expect(extractClaudeReads(text)).toEqual(['/r/a.md', '/r/a.md']);
  });

  it('returns [] when there are no reads', () => {
    expect(extractClaudeReads('')).toEqual([]);
  });
});

describe('extractCursorReads', () => {
  it('returns input.path of ReadFile blocks under message.content, ignoring search tools', () => {
    const text = JSON.stringify({
      message: {
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'ReadFile', input: { limit: 1, offset: 0, path: '/r/b.md' } },
          { type: 'tool_use', name: 'rg', input: { path: '/r', pattern: 'x' } },
        ],
      },
    });
    expect(extractCursorReads(text)).toEqual(['/r/b.md']);
  });
});

describe('extractCodexReads', () => {
  it('returns the path argument of read function_call items, ignoring shell calls', () => {
    const text = [
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'read',
          arguments: JSON.stringify({ path: '/r/c.md' }),
        },
      }),
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'shell',
          arguments: JSON.stringify({ command: 'cat x' }),
        },
      }),
    ].join('\n');
    expect(extractCodexReads(text)).toEqual(['/r/c.md']);
  });
});

describe('extractCopilotReads', () => {
  it('returns data.arguments.path of view tool.execution_start events (real v1.0.61 shape)', () => {
    const text = [
      JSON.stringify({ type: 'user.message', data: { content: 'hi' } }),
      JSON.stringify({
        type: 'tool.execution_start',
        data: { toolName: 'view', arguments: { path: '/r/d.md' } },
      }),
      JSON.stringify({
        type: 'tool.execution_start',
        data: { toolName: 'bash', arguments: { command: 'ls' } },
      }),
    ].join('\n');
    expect(extractCopilotReads(text)).toEqual(['/r/d.md']);
  });
});

describe('extractOpenCodeReads', () => {
  let storageDir: string;
  const sessionId = 'sess-oc';

  beforeEach(() => {
    storageDir = mkdtempSync(join(tmpdir(), 'kk-oc-storage-'));
    const messageDir = join(storageDir, 'message', sessionId);
    mkdirSync(messageDir, { recursive: true });
    writeFileSync(join(messageDir, 'msg-1.json'), JSON.stringify({ id: 'm1', role: 'assistant' }));
    const partDir = join(storageDir, 'part', 'm1');
    mkdirSync(partDir, { recursive: true });
    writeFileSync(join(partDir, 'p0.json'), JSON.stringify({ type: 'text', text: 'hi' }));
    writeFileSync(
      join(partDir, 'p1.json'),
      JSON.stringify({ type: 'tool', tool: 'read', state: { input: { filePath: '/r/e.md' } } })
    );
  });

  afterEach(() => rmSync(storageDir, { recursive: true, force: true }));

  it('returns read tool part paths from the storage tree', () => {
    expect(extractOpenCodeReads(storageDir, sessionId)).toEqual(['/r/e.md']);
  });

  it('returns [] for an unknown session', () => {
    expect(extractOpenCodeReads(storageDir, 'missing')).toEqual([]);
  });
});
