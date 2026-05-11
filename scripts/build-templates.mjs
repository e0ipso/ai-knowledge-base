#!/usr/bin/env node
// Copies src/templates-source/ → templates/ so the npm package ships
// templates that `init` can read without requiring a TS build for them.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'src/templates-source');
const dest = resolve(root, 'templates');

if (!existsSync(src)) {
  console.error(`Source not found: ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} → ${dest}`);
