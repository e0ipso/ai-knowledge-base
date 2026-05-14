import { getHarness, hasHarness, listHarnessIds } from './registry.js';
import type { HarnessAdapter } from './types.js';

/**
 * Walks every registered adapter and returns the first one whose
 * `detectFromEnv` predicate matches the given environment. Returns
 * `null` when nothing claims the env (e.g. running the CLI from a
 * plain shell with no session-specific env vars).
 */
export function detectHarnessFromEnv(env: NodeJS.ProcessEnv = process.env): HarnessAdapter | null {
  for (const id of listHarnessIds()) {
    const adapter = getHarness(id);
    if (adapter.detectFromEnv?.(env)) return adapter;
  }
  return null;
}

export interface ResolveActiveHarnessOpts {
  /** Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /**
   * The `defaultHarness` value read from `config.yaml`. Used when env
   * detection finds no match.
   */
  configuredDefault?: string | undefined;
}

/**
 * Resolves the harness that owns the current process. Strategy:
 *
 *   1. Ask each registered adapter via `detectFromEnv`. First match wins.
 *   2. Fall back to the project's `config.yaml` `defaultHarness` setting.
 *   3. Fall back to the first registered harness (deterministic; in v1
 *      this is always `claude`).
 *
 * This is the single entry point CLI commands and runtime callers use to
 * pick an adapter. Init takes its harness list from the `--assistants`
 * flag and bypasses this function.
 */
export function resolveActiveHarness(opts: ResolveActiveHarnessOpts = {}): HarnessAdapter {
  const env = opts.env ?? process.env;

  const detected = detectHarnessFromEnv(env);
  if (detected) return detected;

  if (opts.configuredDefault) {
    if (!hasHarness(opts.configuredDefault)) {
      throw new Error(
        `config.yaml \`defaultHarness: ${opts.configuredDefault}\` is not a registered harness. ` +
          `Available: ${listHarnessIds().join(', ') || '(none)'}.`
      );
    }
    return getHarness(opts.configuredDefault);
  }

  const ids = listHarnessIds();
  const first = ids[0];
  if (!first) throw new Error('no harness adapters registered');
  return getHarness(first);
}
