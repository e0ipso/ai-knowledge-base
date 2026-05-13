import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LintStateFileSchema, type LintStateFile } from './schemas.js';

export const DEFAULT_LINT_STATE: LintStateFile = {
  schema_version: 1,
  sessions_since_last_lint: 0,
  last_lint_at: null,
  last_errors: 0,
  last_findings: 0,
};

export function lintStateFile(stateDir: string): string {
  return join(stateDir, 'lint-state.json');
}

export function readLintState(file: string): LintStateFile {
  if (!existsSync(file)) return { ...DEFAULT_LINT_STATE };
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const parsed = LintStateFileSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    return { ...DEFAULT_LINT_STATE };
  } catch {
    return { ...DEFAULT_LINT_STATE };
  }
}

export function writeLintState(file: string, state: LintStateFile): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, file);
}
