import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import { log } from '../lib/log.js';
import { readAllNodes } from '../lib/nodes.js';
import { findRepoRoot, repoPaths } from '../lib/paths.js';

const exec = promisify(execFile);

export interface DoctorOptions {
  verbose?: boolean;
}

type CheckResult =
  | { ok: true; detail: string }
  | { ok: false; detail: string; level: 'error' | 'warn' };

interface NamedCheck {
  name: string;
  result: CheckResult;
}

export async function runDoctor(opts: DoctorOptions): Promise<number> {
  const root = findRepoRoot();
  const paths = repoPaths(root);

  const checks: NamedCheck[] = [];
  checks.push({ name: 'Node.js >= 22', result: checkNodeVersion() });
  checks.push({ name: 'claude CLI on PATH', result: await checkClaude() });
  checks.push({ name: 'gitleaks on PATH', result: await checkGitleaks() });
  checks.push({
    name: '.ai/.kb-builder/installed-version',
    result: checkInstalledVersion(paths.installedVersionFile),
  });
  checks.push({
    name: 'pre-commit config installed',
    result: checkPreCommit(paths.preCommitConfigFile),
  });
  checks.push({
    name: '.gitignore lists ai-knowledge-base paths',
    result: checkGitignore(paths.gitignoreFile),
  });

  const dangling = collectDanglingDerivedFrom(root, paths.nodesDir, paths.sessionsDir);
  checks.push({
    name: 'derived_from references resolve',
    result:
      dangling.length === 0
        ? { ok: true, detail: 'no dangling references' }
        : {
            ok: false,
            level: 'warn',
            detail: `${dangling.length} dangling reference(s)${
              opts.verbose ? '' : ' — re-run with --verbose to list them'
            }`,
          },
  });

  let failures = 0;
  let warnings = 0;
  for (const c of checks) {
    if (c.result.ok) {
      log.success(`${c.name}: ${c.result.detail}`);
    } else if (c.result.level === 'warn') {
      log.warn(`${c.name}: ${c.result.detail}`);
      warnings += 1;
    } else {
      log.error(`${c.name}: ${c.result.detail}`);
      failures += 1;
    }
  }

  if (opts.verbose && dangling.length > 0) {
    log.plain('');
    log.plain('Dangling derived_from references:');
    for (const d of dangling) {
      log.plain(`  - ${d.nodeId}: ${d.reference}`);
    }
  }

  log.plain('');
  if (failures === 0 && warnings === 0) {
    log.success('All checks passed.');
    return 0;
  }
  if (failures === 0) {
    log.warn(`${warnings} warning(s).`);
    return 0;
  }
  log.error(`${failures} error(s), ${warnings} warning(s).`);
  return 1;
}

interface DanglingRef {
  nodeId: string;
  reference: string;
}

/**
 * Collects every `derived_from` entry whose target does not exist on disk.
 * A reference resolves if any of these match:
 *   - It is a bare filename and exists under `_sessions/`.
 *   - It is a repo-relative path and exists when resolved against `root`.
 *   - It is an absolute path and exists as-is.
 */
export function collectDanglingDerivedFrom(
  root: string,
  nodesDir: string,
  sessionsDir: string,
): DanglingRef[] {
  if (!existsSync(nodesDir)) return [];
  const out: DanglingRef[] = [];
  for (const node of readAllNodes(nodesDir)) {
    for (const ref of node.frontmatter.derived_from) {
      if (resolvesOnDisk(ref, root, sessionsDir)) continue;
      out.push({ nodeId: node.frontmatter.id, reference: ref });
    }
  }
  return out;
}

function resolvesOnDisk(ref: string, root: string, sessionsDir: string): boolean {
  if (ref.length === 0) return false;
  if (isAbsolute(ref) && existsSync(ref)) return true;
  if (existsSync(join(root, ref))) return true;
  if (!ref.includes('/') && existsSync(join(sessionsDir, ref))) return true;
  return false;
}

function checkNodeVersion(): CheckResult {
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(major) && major >= 22) {
    return { ok: true, detail: `Node ${process.versions.node}` };
  }
  return { ok: false, level: 'error', detail: `Node ${process.versions.node} (need >= 22)` };
}

async function checkClaude(): Promise<CheckResult> {
  try {
    const { stdout } = await exec('claude', ['--version'], { timeout: 5000 });
    return { ok: true, detail: stdout.trim() || 'present' };
  } catch (err) {
    return {
      ok: false,
      level: 'error',
      detail: `not runnable (${(err as Error).message.split('\n')[0]})`,
    };
  }
}

async function checkGitleaks(): Promise<CheckResult> {
  try {
    const { stdout } = await exec('gitleaks', ['version'], { timeout: 5000 });
    return { ok: true, detail: stdout.trim() || 'present' };
  } catch {
    return {
      ok: false,
      level: 'warn',
      detail:
        'not found on PATH. v1 vendors gitleaks via optionalDependencies; install pre-commit and run `pre-commit install` to wire it up, or install gitleaks manually.',
    };
  }
}

function checkInstalledVersion(file: string): CheckResult {
  if (!existsSync(file)) {
    return {
      ok: false,
      level: 'error',
      detail: 'missing. Run `ai-knowledge-base init --assistants claude` from the repo root.',
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { version?: string };
    return { ok: true, detail: parsed.version ?? 'present (no version field)' };
  } catch (err) {
    return { ok: false, level: 'error', detail: `unreadable: ${(err as Error).message}` };
  }
}

function checkPreCommit(file: string): CheckResult {
  if (!existsSync(file)) {
    return {
      ok: false,
      level: 'warn',
      detail: 'no .pre-commit-config.yaml at repo root. Re-run `init` or add gitleaks manually.',
    };
  }
  const body = readFileSync(file, 'utf8');
  if (body.includes('gitleaks')) {
    return { ok: true, detail: 'gitleaks entry present' };
  }
  return { ok: false, level: 'warn', detail: 'present but no gitleaks entry found' };
}

function checkGitignore(file: string): CheckResult {
  if (!existsSync(file)) {
    return { ok: false, level: 'warn', detail: 'no .gitignore at repo root' };
  }
  const body = readFileSync(file, 'utf8');
  if (body.includes('.ai/knowledge-base/_sessions') && body.includes('.ai/knowledge-base/_logs')) {
    return { ok: true, detail: 'ai-knowledge-base block present' };
  }
  return {
    ok: false,
    level: 'warn',
    detail: 'missing entries for `.ai/knowledge-base/_sessions/` and/or `_logs/`',
  };
}
