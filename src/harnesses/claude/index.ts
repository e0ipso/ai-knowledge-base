import type { HarnessAdapter } from '../types.js';
import { claudeDoctorChecks } from './doctor.js';
import { runHeadlessClaude } from './headless.js';
import { CLAUDE_HOOK_SPECS } from './hook-spec.js';
import { installClaude } from './install.js';
import { parseTranscriptJsonl, renderRoleTagged } from './transcript.js';

/**
 * Claude Code harness adapter. Bundles the hook specs, transcript parser,
 * headless runner, install logic, and doctor checks that are specific to
 * Claude Code into a single plug.
 *
 * Register additional harnesses (Codex, OpenCode, …) by adding a sibling
 * directory under `src/harnesses/` and entering it in the registry.
 */
/**
 * Returns true when the process appears to be running inside a Claude Code
 * session. `CLAUDECODE=1` is the explicit marker Claude Code exports; we
 * also accept a non-empty `CLAUDE_PROJECT_DIR` because every Claude hook
 * command is invoked with that variable set.
 */
function detectClaudeFromEnv(env: NodeJS.ProcessEnv): boolean {
  if (env['CLAUDECODE'] === '1') return true;
  const projectDir = env['CLAUDE_PROJECT_DIR'];
  return typeof projectDir === 'string' && projectDir.length > 0;
}

export const claudeAdapter: HarnessAdapter = {
  id: 'claude',
  hooks: CLAUDE_HOOK_SPECS,
  install: opts => installClaude(opts),
  upgrade: opts => installClaude(opts),
  parseTranscript: parseTranscriptJsonl,
  renderTranscript: renderRoleTagged,
  runHeadless: (promptBody, stdin, schema, opts) =>
    runHeadlessClaude(promptBody, stdin, schema, opts ?? {}),
  doctorChecks: paths => claudeDoctorChecks(paths),
  detectFromEnv: detectClaudeFromEnv,
};
