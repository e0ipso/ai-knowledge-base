import type { HookSpec } from '../types.js';

/**
 * Canonical hook declarations for the OpenCode adapter. The plugin shim
 * subscribes to OpenCode's native `event` bus and dispatches to these
 * scripts based on the event type. Names are OpenCode-native
 * (`session.idle`, `session.created`); no translation to Claude/Codex
 * canonical names happens.
 */
export const openCodeHookSpecs: readonly HookSpec[] = [
  { event: 'session.idle', scriptPath: 'kk-capture.cjs' },
  { event: 'session.idle', scriptPath: 'kk-lint-tick.cjs' },
  { event: 'session.created', scriptPath: 'kk-session-start.cjs' },
  { event: 'session.created', scriptPath: 'kk-proposal-drain.cjs', async: true },
];
