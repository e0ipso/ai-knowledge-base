import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import {
  assertValidSessionId,
  buildSessionLogFilename,
  findSessionLogBySessionId,
  renderSessionLog,
} from '../../src/lib/session-log.js';
import { SessionLogFrontmatterSchema } from '../../src/lib/schemas.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// These pure helpers carry custom validation not exercised by the spawned hook
// or command tests: the rendered frontmatter must satisfy the Zod schema, the
// log filename must embed the full UUID after a YYYYMMDD-HHmm stamp, lookup by
// session_id must match on the full suffix, and session ids must be strict
// UUID v4. The hook/command tests only use renderSessionLog as a fixture.

const SAMPLE_V4 = '4c59be08-badd-42cd-981c-ff3b80cf091a';

describe('renderSessionLog + buildSessionLogFilename', () => {
  it('produces frontmatter that validates against the Zod schema', () => {
    const md = renderSessionLog({
      sessionId: SAMPLE_V4,
      capturedBy: 'stop',
      capturedAt: '2026-05-11T12:00:00.000Z',
      transcriptHash: 'sha256:deadbeef',
      body: '[USER]: hi\n\n[AGENT]: hello',
    });
    const parsed = matter(md);
    const result = SessionLogFrontmatterSchema.safeParse(parsed.data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session_id).toBe(SAMPLE_V4);
      expect(result.data.captured_by).toBe('stop');
      expect(result.data.proposal_status).toBe('pending');
    }
    expect(parsed.content).toContain('## Transcript');
    expect(parsed.content).toContain('[USER]: hi');
  });

  it('embeds the full UUID v4 sessionId after the YYYYMMDD-HHmm stamp', () => {
    expect(buildSessionLogFilename('2026-05-11T12:34:00.000Z', SAMPLE_V4)).toBe(
      `20260511-1234-${SAMPLE_V4}.md`
    );
  });
});

describe('findSessionLogBySessionId', () => {
  it('returns the filename whose suffix matches the full sessionId, and null when absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kk-find-sess-'));
    try {
      mkdirSync(dir, { recursive: true });
      const target = `20260511-1234-${SAMPLE_V4}.md`;
      writeFileSync(join(dir, target), '');
      writeFileSync(join(dir, `20260511-1235-${'a'.repeat(8)}-bbbb-4ccc-8ddd-eeeeeeeeeeee.md`), '');
      expect(findSessionLogBySessionId(dir, SAMPLE_V4)).toBe(target);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(findSessionLogBySessionId(join(tmpdir(), 'kk-find-missing-xyz'), SAMPLE_V4)).toBeNull();
  });
});

describe('assertValidSessionId', () => {
  it('accepts and lowercases a valid v4 UUID', () => {
    expect(assertValidSessionId(SAMPLE_V4.toUpperCase())).toBe(SAMPLE_V4);
  });

  it('rejects empty, non-string, non-UUID, and non-v4 inputs', () => {
    expect(() => assertValidSessionId('')).toThrow(/non-empty string/);
    expect(() => assertValidSessionId(null)).toThrow(/non-empty string/);
    expect(() => assertValidSessionId(42)).toThrow(/non-empty string/);
    expect(() => assertValidSessionId('not-a-uuid')).toThrow(/not a UUID v4/);
    // Version nibble is 7 in the third group; everything else matches.
    expect(() => assertValidSessionId('01891234-5678-7abc-8def-0123456789ab')).toThrow(
      /not a UUID v4/
    );
  });
});
