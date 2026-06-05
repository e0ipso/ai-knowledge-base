import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHarness } from '../../src/harnesses/registry.js';
import { parseOpenCodeTranscript } from '../../src/harnesses/opencode/transcript.js';
import { normalizeCursorConversationId } from '../../src/harnesses/cursor/session-id.js';
import { renderRoleTagged } from '../../src/lib/transcript-render.js';

/**
 * One representative two-turn transcript per adapter, expressed in that
 * adapter's native serialization. Each entry drives the adapter's own
 * `parseTranscript` through the registry, so adding a harness that parses
 * a text blob extends this matrix automatically.
 *
 * OpenCode is excluded here: its `parseTranscript` is a placeholder and the
 * real parser reads an on-disk storage tree, so it gets a targeted case
 * below.
 */
const textTranscriptCases: Array<{
  id: string;
  text: string;
  expected: Array<{ role: 'user' | 'agent'; text: string }>;
}> = [
  {
    id: 'claude',
    text: [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'How do I run tests?' } }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Run npm test from the repo root.' }],
        },
      }),
    ].join('\n'),
    expected: [
      { role: 'user', text: 'How do I run tests?' },
      { role: 'agent', text: 'Run npm test from the repo root.' },
    ],
  },
  {
    id: 'codex',
    text: [
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'How do I run tests?' }],
        },
      }),
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Run npm test from the repo root.' }],
        },
      }),
    ].join('\n'),
    expected: [
      { role: 'user', text: 'How do I run tests?' },
      { role: 'agent', text: 'Run npm test from the repo root.' },
    ],
  },
  {
    id: 'copilot',
    text: [
      JSON.stringify({
        type: 'userMessage',
        data: { role: 'user', content: 'How do I run tests?' },
        timestamp: '2026-06-05T00:00:01Z',
        parentId: null,
      }),
      JSON.stringify({
        type: 'agentMessage',
        data: { role: 'assistant', content: 'Run npm test from the repo root.' },
        timestamp: '2026-06-05T00:00:02Z',
        parentId: 'a1',
      }),
    ].join('\n'),
    expected: [
      { role: 'user', text: 'How do I run tests?' },
      { role: 'agent', text: 'Run npm test from the repo root.' },
    ],
  },
  {
    id: 'cursor',
    text: readFileSync(
      join(import.meta.dirname, '../fixtures/cursor-transcript/sample.jsonl'),
      'utf8'
    ),
    expected: [
      { role: 'user', text: 'How do I run tests?' },
      { role: 'agent', text: 'Run `npm test` from the repo root.' },
    ],
  },
];

describe('adapter.parseTranscript (parametrized over registered harnesses)', () => {
  it.each(textTranscriptCases)(
    '$id parses a two-turn exchange and renders role-tagged output',
    ({ id, text, expected }) => {
      const adapter = getHarness(id);
      const parsed = adapter.parseTranscript(text);
      expect(parsed.interleaved).toEqual(expected);
      const rendered = adapter.renderTranscript(parsed);
      expect(rendered).toContain('[USER]:');
      expect(rendered).toContain('[AGENT]:');
    }
  );
});

describe('codex transcript parsing edge cases', () => {
  const codex = getHarness('codex');

  it('dedupes task_complete echoes that match the previous agent turn', () => {
    const lines = [
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'final answer' }],
        },
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'task_complete', last_agent_message: 'final answer' },
      }),
    ];
    expect(codex.parseTranscript(lines.join('\n')).interleaved).toEqual([
      { role: 'agent', text: 'final answer' },
    ]);
  });

  it('concatenates multiple _text blocks in a single response_item', () => {
    const line = JSON.stringify({
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'output_text', text: 'first part' },
          { type: 'output_text', text: 'second part' },
          { type: 'tool_call', text: 'ignored' },
        ],
      },
    });
    expect(codex.parseTranscript(line).interleaved).toEqual([
      { role: 'agent', text: 'first part\nsecond part' },
    ]);
  });

  it('ignores session_meta and skips empty/malformed lines without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lines = [
      JSON.stringify({
        type: 'session_meta',
        payload: { id: 'abc', started_at: '2025-01-01T00:00:00Z' },
      }),
      '',
      '   ',
      'not json at all',
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'still parsed' }],
        },
      }),
    ];
    expect(codex.parseTranscript(lines.join('\n')).interleaved).toEqual([
      { role: 'user', text: 'still parsed' },
    ]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('copilot transcript parsing edge cases', () => {
  const copilot = getHarness('copilot');

  it('concatenates chunked agent output that shares a parentId and role', () => {
    const lines = [
      JSON.stringify({
        type: 'agentMessage',
        data: { role: 'assistant', content: 'part one ' },
        timestamp: '2026-06-05T00:00:01Z',
        parentId: 'turn-1',
      }),
      JSON.stringify({
        type: 'agentMessage',
        data: { role: 'assistant', content: 'part two' },
        timestamp: '2026-06-05T00:00:02Z',
        parentId: 'turn-1',
      }),
    ];
    expect(copilot.parseTranscript(lines.join('\n')).interleaved).toEqual([
      { role: 'agent', text: 'part one \npart two' },
    ]);
  });

  it('falls back to data.role and data.text when type and content are absent', () => {
    const lines = [
      JSON.stringify({
        data: { role: 'user', text: 'hi from text field' },
        timestamp: '2026-06-05T00:00:01Z',
        parentId: null,
      }),
      JSON.stringify({
        data: { role: 'assistant', text: 'hello back' },
        timestamp: '2026-06-05T00:00:02Z',
        parentId: null,
      }),
    ];
    expect(copilot.parseTranscript(lines.join('\n')).interleaved).toEqual([
      { role: 'user', text: 'hi from text field' },
      { role: 'agent', text: 'hello back' },
    ]);
  });

  it('skips a truncated final JSON line and empty input without throwing', () => {
    const lines = [
      JSON.stringify({
        type: 'userMessage',
        data: { role: 'user', content: 'complete line' },
        timestamp: '2026-06-05T00:00:01Z',
        parentId: null,
      }),
      '{"type":"agentMessage","data":{"role":"assistant","content":"trunc',
    ];
    expect(copilot.parseTranscript(lines.join('\n')).interleaved).toEqual([
      { role: 'user', text: 'complete line' },
    ]);
    expect(copilot.parseTranscript('').interleaved).toEqual([]);
    expect(copilot.parseTranscript('   \n  \n').interleaved).toEqual([]);
  });
});

describe('claude transcript parsing edge cases', () => {
  const claude = getHarness('claude');

  it('ignores tool_use and system blocks but keeps text blocks', () => {
    const jsonl = [
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Reading file...' },
            { type: 'tool_use', id: 'x', name: 'Read', input: {} },
          ],
        },
      }),
      JSON.stringify({ type: 'system', content: 'compaction notice' }),
    ].join('\n');
    expect(claude.parseTranscript(jsonl).interleaved).toEqual([
      { role: 'agent', text: 'Reading file...' },
    ]);
  });

  it('skips malformed JSON lines silently', () => {
    const jsonl = [
      'not json',
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'ok' } }),
      '',
    ].join('\n');
    expect(claude.parseTranscript(jsonl).interleaved).toEqual([{ role: 'user', text: 'ok' }]);
  });
});

describe('opencode transcript parsing (on-disk storage tree)', () => {
  const cleanup: string[] = [];
  afterEach(() => {
    for (const p of cleanup) rmSync(p, { recursive: true, force: true });
    cleanup.length = 0;
  });

  function makeStorage(): string {
    const root = mkdtempSync(join(tmpdir(), 'kk-opencode-storage-'));
    cleanup.push(root);
    return root;
  }

  function writeJson(path: string, value: unknown): void {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, JSON.stringify(value));
  }

  it('parses a two-turn exchange ordered by time.created across out-of-order files', () => {
    const storage = makeStorage();
    const sessionId = 'sess-123';
    const projectId = 'proj-abc';

    mkdirSync(join(storage, 'session', projectId), { recursive: true });
    writeJson(join(storage, 'session', projectId, `${sessionId}.json`), {
      id: sessionId,
      projectID: projectId,
      time: { created: 100, updated: 200 },
    });

    const messageDir = join(storage, 'message', sessionId);
    mkdirSync(messageDir, { recursive: true });
    // Write the assistant message first on disk to prove ordering is by time.
    writeJson(join(messageDir, 'z.json'), { id: 'm2', role: 'assistant', time: { created: 120 } });
    writeJson(join(messageDir, 'a.json'), { id: 'm1', role: 'user', time: { created: 110 } });

    writeJson(join(storage, 'part', 'm1', 'p1.json'), {
      id: 'p1',
      type: 'text',
      text: 'hello opencode',
    });
    writeJson(join(storage, 'part', 'm2', 'p1.json'), {
      id: 'p1',
      type: 'text',
      text: 'hi there',
    });

    expect(parseOpenCodeTranscript(storage, sessionId).interleaved).toEqual([
      { role: 'user', text: 'hello opencode' },
      { role: 'agent', text: 'hi there' },
    ]);
  });

  it('returns empty interleaved when the message dir is missing', () => {
    const storage = makeStorage();
    expect(parseOpenCodeTranscript(storage, 'nonexistent').interleaved).toEqual([]);
  });

  it('skips messages whose only parts are non-text (tool calls)', () => {
    const storage = makeStorage();
    const sessionId = 'tool-only';
    const messageDir = join(storage, 'message', sessionId);
    mkdirSync(messageDir, { recursive: true });
    writeJson(join(messageDir, 'm1.json'), { id: 'm1', role: 'assistant', time: { created: 1 } });
    writeJson(join(storage, 'part', 'm1', 'p1.json'), {
      id: 'p1',
      type: 'tool-call',
      text: 'should not appear',
    });
    expect(parseOpenCodeTranscript(storage, sessionId).interleaved).toEqual([]);
  });
});

describe('normalizeCursorConversationId (cursor session-id mapping)', () => {
  it('passes through lowercase UUID v4 ids', () => {
    const id = 'c6b62c6f-7ead-4fd6-9922-e952131177ff';
    expect(normalizeCursorConversationId(id)).toBe(id);
  });

  it('derives a stable UUID-shaped id from non-UUID conversation ids', () => {
    const a = normalizeCursorConversationId('conv-abc123');
    const b = normalizeCursorConversationId('conv-abc123');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('renderRoleTagged self-review-apply tagging', () => {
  it('leaves segments without the slash command unchanged', () => {
    const t = {
      interleaved: [
        { role: 'user' as const, text: 'normal message' },
        { role: 'agent' as const, text: 'normal reply' },
      ],
    };
    expect(renderRoleTagged(t)).toBe('[USER]: normal message\n\n[AGENT]: normal reply');
  });

  it('tags both the trigger user segment and the following agent segment', () => {
    const t = {
      interleaved: [
        { role: 'user' as const, text: '/self-review-apply feedback/round-2.xml' },
        { role: 'agent' as const, text: 'I worked through the comments...' },
      ],
    };
    expect(renderRoleTagged(t)).toBe(
      '[USER /self-review-apply feedback/round-2.xml]: /self-review-apply feedback/round-2.xml\n\n' +
        '[AGENT NARRATION OF SELF-REVIEW feedback/round-2.xml]: I worked through the comments...'
    );
  });

  it('tags only the user segment when no following segment exists', () => {
    const t = {
      interleaved: [{ role: 'user' as const, text: '/self-review-apply feedback/round-2.xml' }],
    };
    expect(renderRoleTagged(t)).toBe(
      '[USER /self-review-apply feedback/round-2.xml]: /self-review-apply feedback/round-2.xml'
    );
  });

  it('tags only the user segment when the next segment is another user segment', () => {
    const t = {
      interleaved: [
        { role: 'user' as const, text: '/self-review-apply feedback/round-2.xml' },
        { role: 'user' as const, text: 'also check the tests' },
      ],
    };
    expect(renderRoleTagged(t)).toBe(
      '[USER /self-review-apply feedback/round-2.xml]: /self-review-apply feedback/round-2.xml\n\n' +
        '[USER]: also check the tests'
    );
  });

  it('does not tag when the trigger is embedded in prose', () => {
    const t = {
      interleaved: [
        { role: 'user' as const, text: 'I will run /self-review-apply foo.xml later today' },
        { role: 'agent' as const, text: 'sure' },
      ],
    };
    expect(renderRoleTagged(t)).toBe(
      '[USER]: I will run /self-review-apply foo.xml later today\n\n[AGENT]: sure'
    );
  });

  it('tags trigger segments with leading and trailing whitespace and preserves the body', () => {
    const t = {
      interleaved: [
        { role: 'user' as const, text: '  /self-review-apply x.xml\n' },
        { role: 'agent' as const, text: 'done' },
      ],
    };
    expect(renderRoleTagged(t)).toBe(
      '[USER /self-review-apply x.xml]:   /self-review-apply x.xml\n\n\n' +
        '[AGENT NARRATION OF SELF-REVIEW x.xml]: done'
    );
  });
});
