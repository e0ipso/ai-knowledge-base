#!/usr/bin/env node
// Builds the shipped `templates/` directory.
//
// 1. Copies `src/templates-source/` (static markdown, settings, etc.) → `templates/`.
// 2. Copies any compiled hook scripts from `dist/hooks/` → `templates/claude/hooks/`.
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
const compiledHooksDir = resolve(root, 'dist/hooks');
const destHooksDir = resolve(dest, 'claude/hooks');

if (!existsSync(src)) {
  console.error(`Source not found: ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} → ${dest}`);

if (existsSync(compiledHooksDir)) {
  mkdirSync(destHooksDir, { recursive: true });
  let copied = 0;
  for (const name of readdirSync(compiledHooksDir)) {
    const from = join(compiledHooksDir, name);
    if (!statSync(from).isFile()) continue;
    if (!name.endsWith('.mjs')) continue;
    cpSync(from, join(destHooksDir, name));
    copied += 1;
  }
  console.log(`Copied ${copied} hook(s) from ${compiledHooksDir} → ${destHooksDir}`);
} else {
  console.warn(
    `Compiled hooks directory not found: ${compiledHooksDir}. Run tsup first ` +
      `(npm run build:cli). Continuing without hooks — templates may be incomplete.`,
  );
}
