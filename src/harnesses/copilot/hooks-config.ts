import { homedir } from 'node:os';
import { join } from 'node:path';
import type { HarnessPaths } from '../types.js';

/**
 * Resolves the user-level Copilot home directory. Copilot reads its hook
 * config from `${COPILOT_HOME:-~/.copilot}/hooks/`; honoring `COPILOT_HOME`
 * keeps the adapter aligned with a non-default install location.
 */
export function copilotHome(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env['COPILOT_HOME'];
  if (explicit && explicit.length > 0) return explicit;
  return join(homedir(), '.copilot');
}

/**
 * Renders the aggregated `{ version: 1, hooks: { ... } }` Copilot hook JSON
 * from `copilotHookSpecs` and atomically writes it to both the user-level
 * file Copilot actually reads (`paths.settingsFile`, i.e.
 * `~/.copilot/hooks/kk.json`) and the in-repo documentation artifact
 * (`<paths.hooksDir>/kk.json`). Both files are byte-identical.
 *
 * Body implemented in Plan 24 Task 3.
 */
export async function writeCopilotHookConfig(_paths: HarnessPaths): Promise<void> {
  throw new Error('writeCopilotHookConfig not implemented');
}

/**
 * Idempotently injects the kenkeep INDEX sentinel block into
 * `<root>/.github/copilot-instructions.md`. Copilot reads that file on
 * session start, so the sentinel block is the v1 channel for session-start
 * context injection. User content outside the block is preserved verbatim.
 *
 * Body implemented in Plan 24 Task 3.
 */
export async function writeCopilotInstructionsSentinel(_paths: HarnessPaths): Promise<void> {
  throw new Error('writeCopilotInstructionsSentinel not implemented');
}
