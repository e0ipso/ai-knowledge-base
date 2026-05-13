import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import yaml from 'js-yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanSandbox, makeSandbox, runCli } from './helpers.js';

const exec = promisify(execFile);

describe('init --upgrade', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = makeSandbox();
    await exec('git', ['init', '-q'], { cwd: sandbox });
  });

  afterEach(() => cleanSandbox(sandbox));

  it('errors when the repo is not initialized', async () => {
    const result = await runCli(sandbox, ['init', '--assistants', 'claude', '--upgrade']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/Not initialized/i);
  });

  it('reports nothing to do when already current', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);
    const result = await runCli(sandbox, ['init', '--assistants', 'claude', '--upgrade']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout + result.stderr).toMatch(/Already at|Nothing to do/);
  });

  it('--upgrade --dry-run lists planned changes without writing when installed-version is older', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);

    // Simulate an older installed version.
    const versionFile = join(sandbox, '.ai/knowledge-base/.state/installed-version');
    const installed = JSON.parse(readFileSync(versionFile, 'utf8'));
    const beforeInstalled = installed.installed_at;
    installed.version = '0.0.0-test-old';
    writeFileSync(versionFile, JSON.stringify(installed, null, 2) + '\n');

    const result = await runCli(sandbox, [
      'init',
      '--assistants',
      'claude',
      '--upgrade',
      '--dry-run',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Planned changes:/);
    expect(result.stdout).toMatch(/stamp installed-version/);
    expect(result.stdout).toMatch(/--dry-run/);

    // installed-version untouched.
    const after = JSON.parse(readFileSync(versionFile, 'utf8'));
    expect(after.version).toBe('0.0.0-test-old');
    expect(after.installed_at).toBe(beforeInstalled);
  });

  it('refreshes hooks but preserves a customized config.yaml', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);

    const configFile = join(sandbox, '.ai/knowledge-base/config.yaml');
    const customized = 'schema_version: 1\ncurationThreshold: 42\n';
    writeFileSync(configFile, customized);

    // Mark installed-version older so upgrade applies.
    const versionFile = join(sandbox, '.ai/knowledge-base/.state/installed-version');
    const installed = JSON.parse(readFileSync(versionFile, 'utf8'));
    installed.version = '0.0.0-test-old';
    writeFileSync(versionFile, JSON.stringify(installed, null, 2) + '\n');

    const result = await runCli(sandbox, ['init', '--assistants', 'claude', '--upgrade']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Upgraded to/);

    // config.yaml untouched.
    expect(readFileSync(configFile, 'utf8')).toBe(customized);

    // Hooks present.
    expect(existsSync(join(sandbox, '.claude/hooks/kb-capture.mjs'))).toBe(true);

    // installed-version bumped to current.
    const after = JSON.parse(readFileSync(versionFile, 'utf8'));
    expect(after.version).not.toBe('0.0.0-test-old');
  });

  it('ships the tightened kb-curate allowed-tools after upgrade', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);

    const versionFile = join(sandbox, '.ai/knowledge-base/.state/installed-version');
    const installed = JSON.parse(readFileSync(versionFile, 'utf8'));
    installed.version = '0.0.0-test-old';
    writeFileSync(versionFile, JSON.stringify(installed, null, 2) + '\n');

    // Pre-populate the installed skill with the previous (looser) allowed-tools
    // to prove that upgrade rewrites the file rather than leaving it untouched.
    const skillFile = join(sandbox, '.claude/skills/kb-curate/SKILL.md');
    writeFileSync(
      skillFile,
      '---\nname: kb-curate\nallowed-tools: Bash(rm:*), Read, Edit, Write\n---\nold\n'
    );

    const result = await runCli(sandbox, ['init', '--assistants', 'claude', '--upgrade']);
    expect(result.exitCode).toBe(0);

    const skill = readFileSync(skillFile, 'utf8');
    expect(skill).toContain('allowed-tools: Bash(ai-knowledge-base curate:*), Read');
    expect(skill).not.toContain('Bash(rm:*)');
    expect(skill).not.toMatch(/allowed-tools:[^\n]*\bEdit\b/);
    expect(skill).not.toMatch(/allowed-tools:[^\n]*\bWrite\b/);
  });

  it('preserves a customized local prompt override', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);

    const promptFile = join(sandbox, '.ai/knowledge-base/.config/prompts/proposal-extract.md');
    writeFileSync(promptFile, '# my local override\n');

    const versionFile = join(sandbox, '.ai/knowledge-base/.state/installed-version');
    const installed = JSON.parse(readFileSync(versionFile, 'utf8'));
    installed.version = '0.0.0-test-old';
    writeFileSync(versionFile, JSON.stringify(installed, null, 2) + '\n');

    const result = await runCli(sandbox, ['init', '--assistants', 'claude', '--upgrade']);
    expect(result.exitCode).toBe(0);
    expect(readFileSync(promptFile, 'utf8')).toBe('# my local override\n');
    expect(result.stdout).toMatch(/local override preserved/);
  });

  it('re-copies a missing prompt during upgrade', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);

    const promptFile = join(sandbox, '.ai/knowledge-base/.config/prompts/proposal-extract.md');
    rmSync(promptFile);

    const versionFile = join(sandbox, '.ai/knowledge-base/.state/installed-version');
    const installed = JSON.parse(readFileSync(versionFile, 'utf8'));
    installed.version = '0.0.0-test-old';
    writeFileSync(versionFile, JSON.stringify(installed, null, 2) + '\n');

    const result = await runCli(sandbox, ['init', '--assistants', 'claude', '--upgrade']);
    expect(result.exitCode).toBe(0);
    expect(existsSync(promptFile)).toBe(true);
    expect(result.stdout).toMatch(/copy new prompt/);
  });

  it('creates config.yaml on upgrade when missing', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);
    const configFile = join(sandbox, '.ai/knowledge-base/config.yaml');
    rmSync(configFile);

    const versionFile = join(sandbox, '.ai/knowledge-base/.state/installed-version');
    const installed = JSON.parse(readFileSync(versionFile, 'utf8'));
    installed.version = '0.0.0-test-old';
    writeFileSync(versionFile, JSON.stringify(installed, null, 2) + '\n');

    const result = await runCli(sandbox, ['init', '--assistants', 'claude', '--upgrade']);
    expect(result.exitCode).toBe(0);
    expect(existsSync(configFile)).toBe(true);
    const body = yaml.load(readFileSync(configFile, 'utf8')) as Record<string, unknown>;
    expect(body.schema_version).toBe(1);
    expect(body.curationThreshold).toBe(5);
  });
});

describe('doctor: installed-version currency', () => {
  let sandbox: string;
  beforeEach(async () => {
    sandbox = makeSandbox();
    await exec('git', ['init', '-q'], { cwd: sandbox });
  });
  afterEach(() => cleanSandbox(sandbox));

  it('warns when installed-version is older than the package', async () => {
    await runCli(sandbox, ['init', '--assistants', 'claude']);
    const versionFile = join(sandbox, '.ai/knowledge-base/.state/installed-version');
    const installed = JSON.parse(readFileSync(versionFile, 'utf8'));
    installed.version = '0.0.0-test-old';
    writeFileSync(versionFile, JSON.stringify(installed, null, 2) + '\n');

    const result = await runCli(sandbox, ['doctor']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout + result.stderr).toMatch(/installed-version is current/);
    expect(result.stdout + result.stderr).toMatch(/init --upgrade/);
  });
});
