import type { HookSpec } from '../types.js';

/**
 * Canonical hook declarations for the Claude Code adapter. The list is
 * the source of truth consumed by `install()`, `doctorChecks()`, and the
 * `writeClaudeHookConfig` settings writer.
 */
export const CLAUDE_HOOK_SPECS: readonly HookSpec[] = [
  { event: 'Stop', scriptPath: 'kk-capture.cjs' },
  { event: 'SessionEnd', scriptPath: 'kk-capture.cjs' },
  { event: 'SessionEnd', scriptPath: 'kk-lint-tick.cjs', async: true },
  { event: 'PreCompact', scriptPath: 'kk-capture.cjs' },
  { event: 'SessionStart', scriptPath: 'kk-proposal-drain.cjs', async: true },
  { event: 'SessionStart', scriptPath: 'kk-session-start.cjs' },
];
