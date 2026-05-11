import { describe, expect, it } from 'vitest';
import { redactSecrets, type GitleaksFinding } from '../../src/lib/gitleaks.js';

describe('redactSecrets', () => {
  it('replaces single secrets with [REDACTED:RuleID]', () => {
    const text = 'Hello SECRETXYZ world.';
    const findings: GitleaksFinding[] = [{ RuleID: 'generic-api-key', Secret: 'SECRETXYZ' }];
    expect(redactSecrets(text, findings)).toBe('Hello [REDACTED:generic-api-key] world.');
  });

  it('redacts longest secrets first to avoid partial overlap', () => {
    const text = 'AKIAFOO and AKIAFOO12345.';
    const findings: GitleaksFinding[] = [
      { RuleID: 'short', Secret: 'AKIAFOO' },
      { RuleID: 'long', Secret: 'AKIAFOO12345' },
    ];
    const out = redactSecrets(text, findings);
    expect(out).toBe('[REDACTED:short] and [REDACTED:long].');
  });

  it('redacts every occurrence of the same secret', () => {
    const findings: GitleaksFinding[] = [{ RuleID: 'token', Secret: 'tok_123' }];
    expect(redactSecrets('A tok_123 B tok_123', findings)).toBe(
      'A [REDACTED:token] B [REDACTED:token]',
    );
  });

  it('skips findings with empty Secret', () => {
    const findings: GitleaksFinding[] = [{ RuleID: 'r', Secret: '' }];
    expect(redactSecrets('unchanged', findings)).toBe('unchanged');
  });

  it('returns unmodified text when no findings', () => {
    expect(redactSecrets('clean text', [])).toBe('clean text');
  });
});
