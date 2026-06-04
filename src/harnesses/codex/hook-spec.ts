import type { HookSpec } from '../types.js';

/**
 * Canonical hook declarations for the Codex CLI adapter. Codex does not
 * emit `SessionEnd` or `PreCompact`, so the lint tick that runs on
 * `SessionEnd` for Claude runs on `Stop` here instead. The list is the
 * source of truth consumed by `install()`, `doctorChecks()`, and the
 * `writeCodexHooks` settings writer.
 */
export const codexHookSpecs: readonly HookSpec[] = [
  { event: 'Stop', scriptPath: 'kk-capture.cjs' },
  { event: 'SessionStart', scriptPath: 'kk-session-start.cjs' },
  { event: 'SessionStart', scriptPath: 'kk-proposal-drain.cjs', async: true },
  { event: 'Stop', scriptPath: 'kk-lint-tick.cjs' },
];
