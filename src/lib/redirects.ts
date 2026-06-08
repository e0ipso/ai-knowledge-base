import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * The redirects ledger filename, stored at the `nodes/` root as
 * `nodes/.redirects.json`. It is the "redirect in history" the plan requires:
 * when split-leaf retires an old id, the ledger records `old id -> [new ids]`
 * so a cross reference to the retired id can still be resolved. It is JSON, not
 * a leaf `.md`, so the node reader and the content hash both ignore it (it is
 * never a node and never perturbs `nodes_hash`).
 */
export const REDIRECTS_FILENAME = '.redirects.json';

const RedirectsLedgerSchema = z.record(z.string(), z.array(z.string()));
export type RedirectsLedger = z.infer<typeof RedirectsLedgerSchema>;

/**
 * Read the redirects ledger from `nodes/.redirects.json`. Returns an empty
 * ledger when the file is absent or unreadable; a corrupt ledger never aborts a
 * read path (lint/doctor/move all tolerate a missing ledger).
 */
export function readRedirectsLedger(nodesDir: string): RedirectsLedger {
  const file = join(nodesDir, REDIRECTS_FILENAME);
  if (!existsSync(file)) return {};
  try {
    const parsed = RedirectsLedgerSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/**
 * Persist the redirects ledger to `nodes/.redirects.json`, keys sorted for a
 * deterministic, diff-friendly file, via an atomic tmp+rename.
 */
export function writeRedirectsLedger(nodesDir: string, ledger: RedirectsLedger): void {
  const file = join(nodesDir, REDIRECTS_FILENAME);
  const sortedKeys = Object.keys(ledger).sort();
  const ordered: RedirectsLedger = {};
  for (const k of sortedKeys) ordered[k] = ledger[k] ?? [];
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(ordered, null, 2)}\n`);
  renameSync(tmp, file);
}

/**
 * Resolve a (possibly retired) node id to the live ids that supersede it.
 * Follows the ledger transitively so a chain of splits (a -> b -> c) resolves
 * `a` to its final survivors. `live` is the set of ids that currently exist on
 * disk; only live ids are returned. An id that is itself live resolves to
 * itself. Returns an empty array when nothing in the chain is live.
 */
export function resolveRedirect(
  ledger: RedirectsLedger,
  live: ReadonlySet<string>,
  id: string
): string[] {
  if (live.has(id)) return [id];
  const out = new Set<string>();
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    const successors = ledger[current];
    if (!successors) continue;
    for (const next of successors) {
      if (live.has(next)) out.add(next);
      else if (!seen.has(next)) stack.push(next);
    }
  }
  return [...out].sort();
}
