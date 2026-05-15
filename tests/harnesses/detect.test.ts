import { describe, expect, it } from 'vitest';
import { detectHarnessFromEnv, resolveActiveHarness } from '../../src/harnesses/detect.js';
import { claudeAdapter } from '../../src/harnesses/claude/index.js';

describe('detectHarnessFromEnv', () => {
  it('returns the claude adapter when CLAUDECODE=1', () => {
    const adapter = detectHarnessFromEnv({ CLAUDECODE: '1' });
    expect(adapter?.id).toBe('claude');
  });

  it('returns the claude adapter when CLAUDE_PROJECT_DIR is set', () => {
    const adapter = detectHarnessFromEnv({ CLAUDE_PROJECT_DIR: '/repo' });
    expect(adapter?.id).toBe('claude');
  });

  it('returns null when no harness env signal is present', () => {
    const adapter = detectHarnessFromEnv({ HOME: '/root', PATH: '/usr/bin' });
    expect(adapter).toBeNull();
  });

  it('treats an empty CLAUDE_PROJECT_DIR as no signal', () => {
    const adapter = detectHarnessFromEnv({ CLAUDE_PROJECT_DIR: '' });
    expect(adapter).toBeNull();
  });

  it('ignores CLAUDECODE values other than "1"', () => {
    const adapter = detectHarnessFromEnv({ CLAUDECODE: '0' });
    expect(adapter).toBeNull();
  });
});

describe('resolveActiveHarness', () => {
  it('returns the adapter named by the explicit --harness flag', () => {
    const adapter = resolveActiveHarness({ flag: 'claude', env: {} });
    expect(adapter).toBe(claudeAdapter);
  });

  it('throws when --harness names an unregistered adapter', () => {
    expect(() => resolveActiveHarness({ flag: 'cursor', env: {} })).toThrow(
      /Unsupported harness 'cursor'/
    );
  });

  it('the --harness flag takes precedence over env detection', () => {
    // The flag is the highest-priority signal: it wins even when the env
    // matches another harness.
    const adapter = resolveActiveHarness({
      flag: 'claude',
      env: { CLAUDECODE: '1' },
    });
    expect(adapter).toBe(claudeAdapter);
  });

  it('prefers env detection over the CLI default when no flag is given', () => {
    // A bogus cliDefault would normally make the resolver throw; the test
    // passes only if env detection short-circuits before the cliDefault
    // is even validated.
    const adapter = resolveActiveHarness({
      env: { CLAUDECODE: '1' },
      cliDefault: 'definitely-not-registered',
    });
    expect(adapter).toBe(claudeAdapter);
  });

  it('uses the CLI default when env detection finds nothing (plain-shell CLI invocation)', () => {
    const adapter = resolveActiveHarness({
      env: {},
      cliDefault: 'claude',
    });
    expect(adapter.id).toBe('claude');
  });

  it('falls back to the first registered harness when nothing else matches', () => {
    const adapter = resolveActiveHarness({ env: {} });
    expect(adapter.id).toBe('claude');
  });

  it('throws when the configured default is not a registered harness', () => {
    expect(() => resolveActiveHarness({ env: {}, cliDefault: 'cursor' })).toThrow(
      /not a registered harness/
    );
  });
});
