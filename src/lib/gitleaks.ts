import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { GitleaksStatus } from './schemas.js';

const exec = promisify(execFile);

export interface GitleaksFinding {
  RuleID: string;
  Secret: string;
  Match?: string;
  StartLine?: number;
  EndLine?: number;
}

export interface GitleaksResult {
  status: GitleaksStatus;
  redactedText: string;
  findings: GitleaksFinding[];
  error?: string;
}

export type GitleaksScanner = (text: string) => Promise<GitleaksResult>;

/**
 * Replaces each finding's `Secret` substring with `[REDACTED:<RuleID>]`.
 * Replacements are applied longest-first so overlapping secrets don't
 * leave partial leakage behind.
 */
export function redactSecrets(text: string, findings: GitleaksFinding[]): string {
  const ordered = [...findings].sort((a, b) => (b.Secret?.length ?? 0) - (a.Secret?.length ?? 0));
  let out = text;
  for (const f of ordered) {
    const secret = f.Secret;
    if (typeof secret !== 'string' || secret.length === 0) continue;
    out = out.split(secret).join(`[REDACTED:${f.RuleID}]`);
  }
  return out;
}

/**
 * Runs gitleaks against the provided text. Times out after `timeoutMs`
 * (default 1000 ms) and treats ENOENT (gitleaks not on PATH) and
 * timeouts as `blocked` — the stage-1 capture aborts in those cases per
 * IMPLEMENTATION §5.1.
 */
export async function scanAndRedact(text: string, timeoutMs = 1000): Promise<GitleaksResult> {
  let dir: string | undefined;
  try {
    dir = mkdtempSync(join(tmpdir(), 'kb-gitleaks-'));
    const inFile = join(dir, 'in.txt');
    const reportFile = join(dir, 'report.json');
    writeFileSync(inFile, text);
    try {
      await exec(
        'gitleaks',
        [
          'detect',
          '--no-git',
          '--source',
          inFile,
          '--report-format',
          'json',
          '--report-path',
          reportFile,
          // Don't propagate non-zero exit just because findings were present;
          // we read the report and decide.
          '--exit-code',
          '0',
        ],
        { timeout: timeoutMs }
      );
    } catch (err) {
      const e = err as NodeJS.ErrnoException & { signal?: string };
      const detail =
        e.code === 'ENOENT'
          ? 'gitleaks not found on PATH'
          : e.signal === 'SIGTERM' || (typeof e.code === 'string' && e.code === 'ETIMEDOUT')
            ? `gitleaks timed out after ${timeoutMs}ms`
            : e.message;
      return { status: 'blocked', redactedText: '', findings: [], error: detail };
    }

    let findings: GitleaksFinding[] = [];
    try {
      const raw = readFileSync(reportFile, 'utf8').trim();
      if (raw.length > 0) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) findings = parsed as GitleaksFinding[];
      }
    } catch {
      // Missing report file means gitleaks didn't write one — treat as clean.
    }

    if (findings.length === 0) {
      return { status: 'clean', redactedText: text, findings: [] };
    }
    return {
      status: 'redacted',
      redactedText: redactSecrets(text, findings),
      findings,
    };
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}
