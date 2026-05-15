import type { HookEvent, HookSpec } from '../types.js';

/**
 * Writes the canonical Codex hook registrations into `.codex/hooks.json`.
 * Implemented by Task 8; this stub keeps the install pathway typechecking
 * and surfaces a clear runtime error if something tries to run the
 * scaffolded adapter before Task 8 lands.
 */
export async function writeCodexHooksConfig(
  _repoRoot: string,
  _hooks: Array<{ event: HookEvent; scriptPath: string; matcher?: string; async?: boolean }>
): Promise<void> {
  throw new Error(
    'writeCodexHooksConfig is not implemented yet (lands in Task 8 of plan 22).'
  );
}

export type { HookSpec };
