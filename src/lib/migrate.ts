import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { INDEX_FILENAME } from './nodes.js';

/**
 * A single ordered step that brings on-disk artifacts from one schema_version to
 * the next. A registry of these lets the dispatcher resolve any gap by chaining
 * steps, so a future schema bump adds one step rather than a new command.
 */
export interface MigrationStep {
  readonly from: number;
  readonly to: number;
  /**
   * True when `run()` drives an LLM-backed harness. The dispatcher refuses the
   * migration unless an explicit `--harness` was passed, so an LLM step never
   * silently falls back to env/config-resolved harness selection.
   */
  readonly requiresHarness: boolean;
  /** Applies the step to the working tree; returns human-readable report lines. */
  run(): Promise<string[]>;
}

const LEGACY_KIND_DIRS = ['practice', 'map'];

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listLeafMarkdown(dir: string): string[] {
  if (!isDirectory(dir)) return [];
  return readdirSync(dir).filter(name => name.endsWith('.md') && name !== INDEX_FILENAME);
}

function collectLeafPaths(rootDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      if (entry.name === INDEX_FILENAME) continue;
      out.push(full);
    }
  };
  walk(rootDir);
  return out;
}

function readSchemaVersion(file: string): number | null {
  try {
    const raw = (matter(readFileSync(file, 'utf8')).data as Record<string, unknown>).schema_version;
    return typeof raw === 'number' ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Reads the schema_version the knowledge base is currently stored at, so the
 * caller can compare it against the code's target version. Returns the lowest
 * version found across leaves (a mixed tree advances from its oldest leaf), or
 * `null` when there is nothing to act on. The legacy two-bucket `nodes/<kind>/`
 * layout (leaf docs with no generated index.md) reads as version 1.
 */
export function detectSchemaVersion(nodesDir: string): number | null {
  if (!isDirectory(nodesDir)) return null;

  for (const kind of LEGACY_KIND_DIRS) {
    const dir = join(nodesDir, kind);
    if (!isDirectory(dir)) continue;
    if (listLeafMarkdown(dir).length > 0 && !existsSync(join(dir, INDEX_FILENAME))) {
      return 1;
    }
  }

  let min = Infinity;
  for (const leaf of collectLeafPaths(nodesDir)) {
    const v = readSchemaVersion(leaf);
    if (v !== null && v < min) min = v;
  }
  return Number.isFinite(min) ? min : null;
}

/**
 * Resolves the ordered chain of steps that takes `current` up to `target`,
 * picking the step whose `from` matches the running version at each hop. Throws
 * when a gap has no step so a missing step fails loudly rather than silently
 * leaving artifacts behind.
 */
export function planMigration(
  steps: readonly MigrationStep[],
  current: number,
  target: number
): MigrationStep[] {
  const chain: MigrationStep[] = [];
  let version = current;
  while (version < target) {
    const next = steps.find(s => s.from === version);
    if (!next) {
      throw new Error(`No step from schema_version ${version} toward ${target}.`);
    }
    chain.push(next);
    version = next.to;
  }
  return chain;
}
