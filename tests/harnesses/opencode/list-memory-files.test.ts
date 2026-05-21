import { describe, expect, it, vi } from 'vitest';
import { execa } from 'execa';
import { openCodeAdapter } from '../../../src/harnesses/opencode/index.js';

vi.mock('execa', () => ({ execa: vi.fn() }));

describe('openCodeAdapter.listMemoryFiles', () => {
  it('returns [] without spawning a child process', async () => {
    const out = await openCodeAdapter.listMemoryFiles();
    expect(out).toEqual([]);
    expect(vi.mocked(execa)).not.toHaveBeenCalled();
  });
});
