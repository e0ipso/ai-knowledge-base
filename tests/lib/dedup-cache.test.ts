import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isDuplicate, recordHash } from '../../src/lib/dedup-cache.js';
import { cleanSandbox, makeSandbox } from '../helpers.js';

describe('dedup-cache', () => {
  let sandbox: string;
  let cacheFile: string;

  beforeEach(() => {
    sandbox = makeSandbox();
    cacheFile = join(sandbox, '.dedup-cache.json');
  });
  afterEach(() => cleanSandbox(sandbox));

  it('returns false for an unseen hash', () => {
    expect(isDuplicate(cacheFile, 'sha256:abc')).toBe(false);
  });

  it('records a hash and recognizes a repeat as duplicate', () => {
    recordHash(cacheFile, 'sha256:abc');
    expect(isDuplicate(cacheFile, 'sha256:abc')).toBe(true);
  });

  it('expires entries older than the 5-minute window', () => {
    const t0 = Date.UTC(2026, 4, 11, 12, 0, 0); // 2026-05-11T12:00:00Z
    recordHash(cacheFile, 'sha256:old', t0);
    // 6 minutes later — outside the 5-minute window.
    const t1 = t0 + 6 * 60 * 1000;
    expect(isDuplicate(cacheFile, 'sha256:old', t1)).toBe(false);
  });

  it('treats a missing cache file as empty', () => {
    expect(isDuplicate(cacheFile, 'sha256:nope')).toBe(false);
    expect(existsSync(cacheFile)).toBe(false);
  });

  it('writes a valid JSON cache file (schema_version + entries)', () => {
    recordHash(cacheFile, 'sha256:abc');
    const parsed = JSON.parse(readFileSync(cacheFile, 'utf8')) as {
      schema_version: number;
      entries: Array<{ hash: string; expires_at: string }>;
    };
    expect(parsed.schema_version).toBe(1);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]?.hash).toBe('sha256:abc');
  });
});
