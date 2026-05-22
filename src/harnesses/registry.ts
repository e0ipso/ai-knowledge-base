import { posix, relative, sep } from 'node:path';
import { claudeAdapter } from './claude/index.js';
import { codexAdapter } from './codex/index.js';
import { cursorAdapter } from './cursor/index.js';
import { openCodeAdapter } from './opencode/index.js';
import type { HarnessAdapter } from './types.js';

/**
 * Plugin registry of available harness adapters. Add a new adapter by
 * dropping a sibling directory under `src/harnesses/` that exports a
 * `HarnessAdapter` and registering it here.
 *
 * The registry is intentionally a plain map — every consumer surface
 * (`init`, `doctor`, `curate`, …) goes through `getHarness(id)` so the
 * rest of the codebase has no knowledge of which harnesses exist.
 */
const ADAPTERS: Readonly<Record<string, HarnessAdapter>> = {
  [claudeAdapter.id]: claudeAdapter,
  [codexAdapter.id]: codexAdapter,
  [cursorAdapter.id]: cursorAdapter,
  [openCodeAdapter.id]: openCodeAdapter,
};

export function listHarnessIds(): string[] {
  return Object.keys(ADAPTERS).sort();
}

export function getHarness(id: string): HarnessAdapter {
  const adapter = ADAPTERS[id];
  if (!adapter) {
    throw new Error(`Unsupported harness '${id}'. Supported: ${listHarnessIds().join(', ')}.`);
  }
  return adapter;
}

export function hasHarness(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ADAPTERS, id);
}

/**
 * Repo-relative posix glob patterns matching the on-disk directories every
 * registered harness uses to host AI instructions — `skillsDir`,
 * `commandsDir`, `hooksDir`, and `pluginsDir`. Bootstrap feeds these into
 * its static-skip layer so the default doc scan does not ingest markdown
 * describing how the AI should act (skills, commands, hook scripts,
 * plugins) rather than what the project is. An explicit `--include` can
 * still opt a specific path back in.
 *
 * Sorted and deduplicated for determinism. New harnesses contribute their
 * own patterns automatically — no hand-edited list to keep in sync.
 */
export function harnessInstructionSkipPatterns(repoRoot: string): string[] {
  const patterns = new Set<string>();
  for (const id of listHarnessIds()) {
    const adapter = ADAPTERS[id];
    if (!adapter) continue;
    const paths = adapter.paths(repoRoot);
    const dirs: (string | undefined)[] = [
      paths.skillsDir,
      paths.commandsDir,
      paths.hooksDir,
      paths.pluginsDir,
    ];
    for (const dir of dirs) {
      if (!dir) continue;
      const rel = relative(repoRoot, dir).split(sep).join(posix.sep);
      if (!rel || rel.startsWith('..')) continue;
      patterns.add(`${rel}/**`);
    }
  }
  return Array.from(patterns).sort();
}
