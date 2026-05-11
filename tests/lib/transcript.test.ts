import { describe, expect, it } from 'vitest';
import { parseTranscriptJsonl, renderRoleTagged } from '../../src/lib/transcript.js';

describe('parseTranscriptJsonl', () => {
  it('extracts user and assistant text from JSONL', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'Hello' } }),
      JSON.stringify({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Hi there' }] },
      }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'Use bravo_pii cache.' } }),
    ].join('\n');

    const parsed = parseTranscriptJsonl(jsonl);
    expect(parsed.user).toEqual(['Hello', 'Use bravo_pii cache.']);
    expect(parsed.agent).toEqual(['Hi there']);
    expect(parsed.interleaved.map(s => s.role)).toEqual(['user', 'agent', 'user']);
  });

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

    const parsed = parseTranscriptJsonl(jsonl);
    expect(parsed.agent).toEqual(['Reading file...']);
    expect(parsed.user).toEqual([]);
  });

  it('skips malformed JSON lines silently', () => {
    const jsonl = [
      'not json',
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'ok' } }),
      '',
    ].join('\n');
    const parsed = parseTranscriptJsonl(jsonl);
    expect(parsed.user).toEqual(['ok']);
  });

  it('renders role-tagged transcript with USER / AGENT prefixes', () => {
    const t = {
      user: ['hi'],
      agent: ['hello'],
      interleaved: [
        { role: 'user' as const, text: 'hi' },
        { role: 'agent' as const, text: 'hello' },
      ],
    };
    expect(renderRoleTagged(t)).toBe('[USER]: hi\n\n[AGENT]: hello');
  });
});
