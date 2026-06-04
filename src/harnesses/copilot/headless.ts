import type { ZodSchema } from 'zod';
import type { HeadlessRunOptions } from '../types.js';

export interface CopilotHeadlessOptions extends HeadlessRunOptions {
  /**
   * Override the `copilot` binary path. Defaults to `'copilot'` on PATH;
   * tests point this at a stub script that prints a canned final answer.
   */
  copilotCli?: string;
  /**
   * Repository root passed to `copilot --add-dir` so the agent can read
   * project files. Defaults to `process.cwd()`.
   */
  repoRoot?: string;
}

/**
 * Spawns `copilot -p` in programmatic mode, parses the embedded fenced JSON
 * payload from the final stdout text, and validates it against `schema`.
 * Body implemented in Plan 24 Task 5.
 */
export async function runHeadlessCopilot<T>(
  _promptBody: string,
  _stdin: string,
  _schema: ZodSchema<T>,
  _opts: CopilotHeadlessOptions = {}
): Promise<T> {
  throw new Error('runHeadlessCopilot not implemented');
}
