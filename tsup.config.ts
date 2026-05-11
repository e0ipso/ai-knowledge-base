import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node22',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  minify: false,
  shims: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
