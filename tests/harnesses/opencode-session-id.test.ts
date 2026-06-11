import { describe, expect, it } from 'vitest';
import { normalizeOpenCodeSessionId } from '../../src/harnesses/opencode/session-id.js';
import { assertValidSessionId } from '../../src/lib/session-log.js';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('normalizeOpenCodeSessionId', () => {
  it('passes through a valid UUID v4 unchanged (lowercased)', () => {
    expect(normalizeOpenCodeSessionId('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    );
  });

  it('derives a UUID v4 that assertValidSessionId accepts from an OpenCode ses_ id', () => {
    const derived = normalizeOpenCodeSessionId('ses_14a1371d9ffeGsvaB7Eou769xq');
    expect(derived).toMatch(UUID_V4_RE);
    expect(() => assertValidSessionId(derived)).not.toThrow();
    expect(assertValidSessionId(derived)).toBe(derived);
  });

  it('is deterministic: same input yields the same output', () => {
    const input = 'ses_14a1371d9ffeGsvaB7Eou769xq';
    expect(normalizeOpenCodeSessionId(input)).toBe(normalizeOpenCodeSessionId(input));
  });
});
