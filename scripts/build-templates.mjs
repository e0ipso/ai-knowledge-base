#!/usr/bin/env node
// Builds the shipped `templates/` directory.
//
// 1. Copies `src/templates-source/` (static markdown, settings, etc.) into `templates/`.
// 2. Copies compiled hook scripts from `dist/hooks/<harness>/*.mjs` into
//    `templates/<harness>/hooks/*.mjs` for every discovered harness.
//
// Run after `tsup` so the compiled hooks exist; the package's `prepare`
// script wires this up.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'src/templates-source');
const dest = resolve(root, 'templates');
const compiledHooksRoot = resolve(root, 'dist/hooks');

if (!existsSync(src)) {
  console.error(`Source not found: ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} -> ${dest}`);

if (existsSync(compiledHooksRoot)) {
  for (const harnessId of readdirSync(compiledHooksRoot)) {
    const harnessDir = join(compiledHooksRoot, harnessId);
    if (!statSync(harnessDir).isDirectory()) continue;
    const destHooksDir = resolve(dest, harnessId, 'hooks');
    mkdirSync(destHooksDir, { recursive: true });
    let copied = 0;
    for (const name of readdirSync(harnessDir)) {
      const from = join(harnessDir, name);
      if (!statSync(from).isFile()) continue;
      if (!name.endsWith('.mjs')) continue;
      cpSync(from, join(destHooksDir, name));
      copied += 1;
    }
    console.log(`Copied ${copied} ${harnessId} hook(s) -> ${destHooksDir}`);
  }
} else {
  console.warn(
    `Compiled hooks directory not found: ${compiledHooksRoot}. Run tsup first ` +
      `(npm run build:cli). Continuing without hooks; templates may be incomplete.`
  );
}
