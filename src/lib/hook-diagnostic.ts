import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Appends one NDJSON line to `<logsDir>/hook-errors-YYYY-MM-DD.log`
 * recording a swallowed hook failure. The entire body is wrapped in a
 * single broad try/catch so a failed diagnostic write never surfaces:
 * the function returns `void` and never throws.
 *
 * Date stamps use UTC so file rollover is timezone-independent and
 * predictable across machines.
 */
export function appendHookDiagnostic(
  hook: string,
  phase: string,
  error: unknown,
  logsDir: string
): void {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const ts = now.toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const line = JSON.stringify({ ts, hook, phase, error: errorMessage }) + '\n';
    mkdirSync(logsDir, { recursive: true });
    appendFileSync(join(logsDir, `hook-errors-${dateStr}.log`), line, 'utf8');
  } catch {
    // Best-effort. A failed diagnostic write must never surface.
  }
}
