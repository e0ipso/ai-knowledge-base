import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readState, writeState } from '../../src/lib/state.js';

describe('state.json round-trip', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kb-state-'));
    file = join(dir, '.state', 'state.json');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('returns schema_version stub when file is missing', () => {
    expect(readState(file)).toEqual({ schema_version: 1 });
  });

  it('round-trips schema_version and last_nudged_at', () => {
    writeState(file, {
      schema_version: 1,
      last_nudged_at: '2026-05-11T09:00:00Z',
    });
    expect(readState(file)).toEqual({
      schema_version: 1,
      last_nudged_at: '2026-05-11T09:00:00Z',
    });
  });

  it('silently drops an obsolete `lock` field on read', () => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({
        schema_version: 1,
        last_nudged_at: '2026-05-11T09:00:00Z',
        lock: {
          name: 'curator',
          pid: 99999,
          acquired_at: '2020-01-01T00:00:00Z',
          ttl_ms: 1800000,
        },
      })
    );
    const state = readState(file) as { schema_version: 1; last_nudged_at?: string | null } & {
      lock?: unknown;
    };
    expect(state.schema_version).toBe(1);
    expect(state.last_nudged_at).toBe('2026-05-11T09:00:00Z');
    expect(state.lock).toBeUndefined();
  });
});
