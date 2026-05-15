import type { ZodSchema } from 'zod';
import type { HeadlessRunOptions } from '../types.js';

/**
 * Spawns `codex exec --json` with the supplied prompt and validates the
 * structured final answer against `schema`. Implemented by Task 10; this
 * stub keeps the adapter wiring intact so the registry, tests, and
 * typechecker can run before the runner lands.
 */
export async function runHeadlessCodex<T>(
  _promptBody: string,
  _stdin: string,
  _schema: ZodSchema<T>,
  _opts: HeadlessRunOptions = {}
): Promise<T> {
  throw new Error(
    'runHeadlessCodex is not implemented yet (lands in Task 10 of plan 22).'
  );
}
