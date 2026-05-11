import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { DedupCacheFileSchema } from './schemas.js';

export const DEDUP_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  hash: string;
  expires_at: string;
}

function loadEntries(file: string): CacheEntry[] {
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const parsed = DedupCacheFileSchema.safeParse(raw);
    if (parsed.success) return parsed.data.entries;
    return [];
  } catch {
    return [];
  }
}

function pruneExpired(entries: CacheEntry[], nowMs: number): CacheEntry[] {
  return entries.filter((e) => {
    const t = Date.parse(e.expires_at);
    return Number.isFinite(t) && t > nowMs;
  });
}

export function isDuplicate(cacheFile: string, hash: string, nowMs: number = Date.now()): boolean {
  const entries = pruneExpired(loadEntries(cacheFile), nowMs);
  return entries.some((e) => e.hash === hash);
}

export function recordHash(cacheFile: string, hash: string, nowMs: number = Date.now()): void {
  const entries = pruneExpired(loadEntries(cacheFile), nowMs).filter((e) => e.hash !== hash);
  entries.push({ hash, expires_at: new Date(nowMs + DEDUP_TTL_MS).toISOString() });
  const tmp = `${cacheFile}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ schema_version: 1, entries }, null, 2)}\n`);
  renameSync(tmp, cacheFile);
}
