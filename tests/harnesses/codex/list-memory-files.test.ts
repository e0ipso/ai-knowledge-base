import { describe, expect, it, vi } from 'vitest';
import { execa } from 'execa';
import { codexAdapter } from '../../../src/harnesses/codex/index.js';

vi.mock('execa', () => ({ execa: vi.fn() }));

describe('codexAdapter.listMemoryFiles', () => {
  it('returns [] without spawning a child process', async () => {
    const out = await codexAdapter.listMemoryFiles();
    expect(out).toEqual([]);
    expect(vi.mocked(execa)).not.toHaveBeenCalled();
  });
});
