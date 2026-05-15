import type { ZodSchema } from 'zod';
import type { HeadlessRunOptions } from '../types.js';

/**
 * Placeholder headless runner. The real implementation that spawns
 * `opencode run --format json` and parses the event stream lives in
 * Task 7. The adapter's `runHeadless` plug binds to this function so
 * the build is green; calling it throws.
 */
export async function runHeadlessOpenCode<T>(
  _promptBody: string,
  _stdin: string,
  _schema: ZodSchema<T>,
  _opts: HeadlessRunOptions = {}
): Promise<T> {
  throw new Error('runHeadlessOpenCode is not implemented yet (Plan 23 Task 7)');
}
