import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendToQueue, readQueue } from '../../src/lib/queue.js';
import type { QueueEntry } from '../../src/lib/schemas.js';
import { cleanSandbox, makeSandbox } from '../helpers.js';

function entry(id: string): QueueEntry {
  return {
    session_id: id,
    session_log: `${id}.md`,
    captured_by: 'stop',
    captured_at: '2026-05-11T12:00:00Z',
    attempts: 0,
  };
}

describe('queue', () => {
  let sandbox: string;
  let queueFile: string;

  beforeEach(() => {
    sandbox = makeSandbox();
    queueFile = join(sandbox, '.queue.json');
  });
  afterEach(() => cleanSandbox(sandbox));

  it('readQueue returns empty when missing', () => {
    expect(readQueue(queueFile)).toEqual({ schema_version: 1, entries: [] });
  });

  it('appends entries cumulatively', () => {
    appendToQueue(queueFile, entry('a'));
    appendToQueue(queueFile, entry('b'));
    const q = readQueue(queueFile);
    expect(q.entries.map((e) => e.session_id)).toEqual(['a', 'b']);
  });

  it('appends atomically (no .tmp file left behind)', () => {
    appendToQueue(queueFile, entry('a'));
    expect(existsSync(`${queueFile}.tmp`)).toBe(false);
    expect(existsSync(queueFile)).toBe(true);
  });

  it('tolerates a malformed existing queue file (resets to empty + appends)', () => {
    writeFileSync(queueFile, 'not json{');
    appendToQueue(queueFile, entry('a'));
    const q = readQueue(queueFile);
    expect(q.entries.map((e) => e.session_id)).toEqual(['a']);
  });
});
