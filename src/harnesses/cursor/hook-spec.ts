import type { HookSpec } from '../types.js';

/**
 * Canonical hook declarations for the Cursor adapter. Native Cursor event
 * names are camelCase and are written to `.cursor/hooks.json` as-is (no
 * translation to Claude PascalCase).
 */
export const cursorHookSpecs: readonly HookSpec[] = [
  { event: 'stop', scriptPath: 'kk-capture.cjs' },
  { event: 'sessionEnd', scriptPath: 'kk-capture.cjs' },
  { event: 'sessionEnd', scriptPath: 'kk-lint-tick.cjs' },
  { event: 'preCompact', scriptPath: 'kk-capture.cjs' },
  { event: 'sessionStart', scriptPath: 'kk-session-start.cjs' },
  { event: 'sessionStart', scriptPath: 'kk-proposal-drain.cjs' },
];
