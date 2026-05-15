import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

/**
 * Discovers every `src/harnesses/<id>/hooks/*.ts` entry. Output paths use
 * the `<id>/<name>` shape so tsup writes
 * `dist/hooks/<id>/<name>.mjs`; the build-templates script then mirrors
 * those into `templates/<id>/hooks/<name>.mjs`. Adding a new harness
 * adapter is a pure drop-in: no edits to this config.
 */
function discoverHookEntries(): Record<string, string> {
  const out: Record<string, string> = {};
  const harnessesDir = 'src/harnesses';
  let harnessIds: string[];
  try {
    harnessIds = readdirSync(harnessesDir);
  } catch {
    return out;
  }
  for (const id of harnessIds) {
    const hooksDir = join(harnessesDir, id, 'hooks');
    let entries: string[];
    try {
      entries = readdirSync(hooksDir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith('.ts')) continue;
      const full = join(hooksDir, name);
      if (!statSync(full).isFile()) continue;
      const stem = name.slice(0, -'.ts'.length);
      out[`${id}/${stem}`] = full;
    }
  }
  return out;
}

export default defineConfig([
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    target: 'node22',
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: false,
    minify: false,
    shims: false,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    // Hooks ship as compiled, self-contained .mjs files. We use the
    // .mjs extension so they run as ESM in consumer repos regardless
    // of the consumer's package.json `type` field.
    entry: discoverHookEntries(),
    outDir: 'dist/hooks',
    format: ['esm'],
    target: 'node22',
    splitting: false,
    sourcemap: false,
    clean: false,
    dts: false,
    minify: false,
    shims: false,
    outExtension: () => ({ js: '.mjs' }),
  },
]);
