import { describe, expect, it } from 'vitest';
import { claudeAdapter } from '../../src/harnesses/claude/index.js';
import { codexAdapter } from '../../src/harnesses/codex/index.js';
import { getHarness, hasHarness, listHarnessIds } from '../../src/harnesses/registry.js';

describe('harness registry', () => {
  it('returns the codex adapter from getHarness("codex")', () => {
    expect(getHarness('codex')).toBe(codexAdapter);
  });

  it('returns the claude adapter from getHarness("claude")', () => {
    expect(getHarness('claude')).toBe(claudeAdapter);
  });

  it('lists both claude and codex harness ids', () => {
    expect(listHarnessIds()).toEqual(['claude', 'codex']);
  });

  it('hasHarness recognizes both registered ids', () => {
    expect(hasHarness('claude')).toBe(true);
    expect(hasHarness('codex')).toBe(true);
    expect(hasHarness('not-a-real-harness')).toBe(false);
  });

  it('throws a helpful error for unregistered harnesses', () => {
    expect(() => getHarness('cursor')).toThrow(/Unsupported harness 'cursor'/);
  });
});

describe('codex adapter shape', () => {
  it('exposes the documented paths under the repo root', () => {
    const paths = codexAdapter.paths('/repo');
    expect(paths.dir).toBe('/repo/.codex');
    expect(paths.hooksDir).toBe('/repo/.codex/hooks');
    expect(paths.skillsDir).toBe('/repo/.agents/skills');
    expect(paths.settingsFile).toBe('/repo/.codex/hooks.json');
    expect(paths.commandsDir).toBeUndefined();
  });

  it('declares Stop and SessionStart hooks only (no SessionEnd or PreCompact)', () => {
    const events = new Set(codexAdapter.hooks.map(h => h.event));
    expect(events.has('Stop')).toBe(true);
    expect(events.has('SessionStart')).toBe(true);
    expect(events.has('SessionEnd')).toBe(false);
    expect(events.has('PreCompact')).toBe(false);
  });
});
