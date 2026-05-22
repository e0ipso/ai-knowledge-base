import { describe, expect, it } from 'vitest';
import { extractJsonPayload } from '../../src/lib/json-extract.js';

describe('extractJsonPayload', () => {
  it('returns raw object payloads unchanged after trimming', () => {
    const raw = '  {"hello":"world"}  ';
    expect(extractJsonPayload(raw)).toBe('{"hello":"world"}');
  });

  it('returns raw array payloads unchanged after trimming', () => {
    const raw = '\n[1, 2, 3]\n';
    expect(extractJsonPayload(raw)).toBe('[1, 2, 3]');
  });

  it('unwraps a ```json fenced block', () => {
    const raw = '```json\n{"a":1}\n```';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({ a: 1 });
  });

  it('unwraps a bare ``` fenced block', () => {
    const raw = '```\n[true, false]\n```';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual([true, false]);
  });

  it('unwraps a fenced block preceded by prose', () => {
    const raw = 'Sure, here is the JSON:\n\n```json\n{"ok":true}\n```';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({ ok: true });
  });

  it('extracts a trailing bare object after prose with no fence', () => {
    const raw = 'I analyzed the input and decided:\n{"verdict":"keep"}';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({ verdict: 'keep' });
  });

  it('returns the last balanced object when several appear in prose', () => {
    const raw =
      'First I considered {"draft":1} but ultimately the answer is {"final":2}';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({ final: 2 });
  });

  it('skips a fenced non-JSON block and finds the trailing JSON', () => {
    const raw =
      'Background:\n```bash\necho hi\n```\nAnswer:\n```json\n{"x":42}\n```';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({ x: 42 });
  });

  it('does not break on braces embedded in string values', () => {
    const raw = 'note: {"text":"this has a } inside and a { too","n":7}';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({
      text: 'this has a } inside and a { too',
      n: 7,
    });
  });

  it('handles escaped quotes inside strings', () => {
    const raw = 'reply: {"msg":"she said \\"hi\\"","ok":true}';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({
      msg: 'she said "hi"',
      ok: true,
    });
  });

  it('handles nested structures', () => {
    const raw = '```json\n{"outer":{"inner":[1,2,{"deep":true}]}}\n```';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({
      outer: { inner: [1, 2, { deep: true }] },
    });
  });

  it('returns trimmed input when no JSON-like span is present', () => {
    const raw = '  no json here at all  ';
    expect(extractJsonPayload(raw)).toBe('no json here at all');
  });

  it('returns trimmed input for unbalanced fragments so downstream parse fails', () => {
    const raw = 'partial: {"a":1';
    const out = extractJsonPayload(raw);
    expect(() => JSON.parse(out)).toThrow();
  });

  it('handles CRLF line endings inside fenced blocks', () => {
    const raw = '```json\r\n{"crlf":true}\r\n```';
    expect(JSON.parse(extractJsonPayload(raw))).toEqual({ crlf: true });
  });

  it('returns empty string for empty input', () => {
    expect(extractJsonPayload('')).toBe('');
    expect(extractJsonPayload('   \n  ')).toBe('');
  });
});
