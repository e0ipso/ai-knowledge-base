import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getHarness, listHarnessIds } from '../../src/harnesses/registry.js';
import { ensureKbignore, renderKbignoreStub } from '../../src/lib/kbignore-stub.js';

describe('renderKbignoreStub', () => {
  it('is deterministic for the same adapter list', () => {
    const adapters = listHarnessIds().map(id => getHarness(id));
    const a = renderKbignoreStub(adapters);
    const b = renderKbignoreStub(adapters);
    expect(a).toBe(b);
  });

  it('is deterministic regardless of input order (adapters sorted)', () => {
    const ids = listHarnessIds();
    const forwards = ids.map(id => getHarness(id));
    const reversed = [...forwards].reverse();
    expect(renderKbignoreStub(forwards)).toBe(renderKbignoreStub(reversed));
  });

  it('includes every registered harness adapter\'s instruction directories', () => {
    const adapters = listHarnessIds().map(id => getHarness(id));
    const out = renderKbignoreStub(adapters);
    for (const adapter of adapters) {
      const paths = adapter.paths('/');
      for (const dir of [paths.skillsDir, paths.commandsDir, paths.hooksDir, paths.pluginsDir]) {
        if (!dir) continue;
        const rel = dir.replace(/^\//, '');
        expect(out, `expected ${rel}/ in stub`).toContain(`${rel}/`);
      }
    }
  });

  it('mentions STATIC_SKIPS in the header so users understand the always-on layer', () => {
    const out = renderKbignoreStub(listHarnessIds().map(id => getHarness(id)));
    expect(out).toContain('STATIC_SKIPS');
  });
});

describe('ensureKbignore', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kb-kbignore-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the stub when absent', () => {
    const result = ensureKbignore(dir);
    expect(result.written).toBe(true);
    expect(result.path).toBe(join(dir, '.kbignore'));
    expect(existsSync(result.path)).toBe(true);
    expect(readFileSync(result.path, 'utf8')).toContain('STATIC_SKIPS');
  });

  it('does not overwrite an existing file', () => {
    const path = join(dir, '.kbignore');
    const userBody = '# my custom rules\nfoo/\n';
    writeFileSync(path, userBody);

    const result = ensureKbignore(dir);
    expect(result.written).toBe(false);
    expect(result.path).toBe(path);
    expect(readFileSync(path, 'utf8')).toBe(userBody);
  });
});
