import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import matter from 'gray-matter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanSandbox, makeSandbox, runCli } from '../helpers.js';

const exec = promisify(execFile);

interface ProposedNodeFixture {
  id: string;
  title: string;
  kind: 'practice' | 'map';
  tags: string[];
  summary: string;
  body: string;
  confidence: 'low' | 'medium' | 'high';
  derived_from: string[];
  relates_to: string[];
}

interface ConflictFixture {
  id: string;
  detected_at: string;
  run_id: string;
  candidate_origin: string;
  target_node_id: string | null;
  rationale: string;
  proposed_node: ProposedNodeFixture | null;
}

function writeNode(
  sandbox: string,
  kind: 'practice' | 'map',
  id: string,
  body = '# original\noriginal body\n'
): void {
  const dir = join(sandbox, '.ai/knowledge-base/nodes', kind);
  mkdirSync(dir, { recursive: true });
  const fm = {
    schema_version: 1,
    id,
    title: id,
    kind,
    tags: [],
    derived_from: [],
    relates_to: [],
    confidence: 'high',
    summary: 's',
  };
  writeFileSync(join(dir, `${id}.md`), matter.stringify(body, fm));
}

function writeConflicts(sandbox: string, conflicts: ConflictFixture[]): string {
  const file = join(sandbox, '.ai/knowledge-base/.state/pending-conflicts.json');
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ schema_version: 1, conflicts }, null, 2)}\n`);
  return file;
}

function makeProposed(id: string, kind: 'practice' | 'map' = 'practice'): ProposedNodeFixture {
  return {
    id,
    title: `${id} replaced`,
    kind,
    tags: [],
    summary: 'replaced summary',
    body: '# replaced\nreplaced body content.\n',
    confidence: 'high',
    derived_from: [],
    relates_to: [],
  };
}

function makeConflict(overrides: Partial<ConflictFixture> = {}): ConflictFixture {
  const targetId = overrides.target_node_id ?? 'practice-foo';
  return {
    id: '01HZZZZZZZZZZZZZZZZZZZZ001',
    detected_at: '2026-05-13T00:00:00.000Z',
    run_id: 'run-1',
    candidate_origin: 'session:foo:practice:0',
    target_node_id: targetId,
    rationale: 'The proposed node contradicts the existing one.',
    proposed_node: targetId ? makeProposed(targetId) : null,
    ...overrides,
  };
}

describe('conflict list', () => {
  let sandbox: string;
  beforeEach(async () => {
    sandbox = makeSandbox();
    await exec('git', ['init', '-q'], { cwd: sandbox });
    await runCli(sandbox, ['init', '--assistants', 'claude']);
  });
  afterEach(() => cleanSandbox(sandbox));

  it('prints `[]` and exits 0 when pending-conflicts.json is missing', async () => {
    const file = join(sandbox, '.ai/knowledge-base/.state/pending-conflicts.json');
    expect(existsSync(file)).toBe(false);
    const result = await runCli(sandbox, ['conflict', 'list']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('[]');
  });

  it('prints the conflicts array as parseable JSON when entries exist', async () => {
    writeNode(sandbox, 'practice', 'practice-foo');
    const conflict = makeConflict();
    writeConflicts(sandbox, [conflict]);
    const result = await runCli(sandbox, ['conflict', 'list']);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as ConflictFixture[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.id).toBe(conflict.id);
    expect(parsed[0]!.target_node_id).toBe('practice-foo');
    expect(parsed[0]!.proposed_node?.title).toBe('practice-foo replaced');
  });
});

describe('conflict resolve', () => {
  let sandbox: string;
  beforeEach(async () => {
    sandbox = makeSandbox();
    await exec('git', ['init', '-q'], { cwd: sandbox });
    await runCli(sandbox, ['init', '--assistants', 'claude']);
  });
  afterEach(() => cleanSandbox(sandbox));

  it('--action replace overwrites the existing node, drops the entry, regenerates INDEX/GRAPH', async () => {
    writeNode(sandbox, 'practice', 'practice-foo');
    const file = writeConflicts(sandbox, [makeConflict()]);
    const indexFile = join(sandbox, '.ai/knowledge-base/INDEX.md');
    const beforeIndex = existsSync(indexFile) ? readFileSync(indexFile, 'utf8') : '';

    const result = await runCli(sandbox, [
      'conflict',
      'resolve',
      '01HZZZZZZZZZZZZZZZZZZZZ001',
      '--action',
      'replace',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('replaced 01HZZZZZZZZZZZZZZZZZZZZ001');

    const nodeBody = readFileSync(
      join(sandbox, '.ai/knowledge-base/nodes/practice/practice-foo.md'),
      'utf8'
    );
    expect(nodeBody).toContain('replaced body content.');
    expect(nodeBody).toContain('summary: replaced summary');
    expect(nodeBody).not.toContain('original body');

    const remaining = JSON.parse(readFileSync(file, 'utf8')) as {
      conflicts: ConflictFixture[];
    };
    expect(remaining.conflicts).toEqual([]);

    expect(existsSync(indexFile)).toBe(true);
    const afterIndex = readFileSync(indexFile, 'utf8');
    expect(afterIndex).not.toBe(beforeIndex);
    expect(afterIndex).toContain('practice-foo replaced');

    const graphFile = join(sandbox, '.ai/knowledge-base/GRAPH.md');
    expect(readFileSync(graphFile, 'utf8')).toContain('## practice-foo');
  });

  it('--action reject removes the entry, regenerates INDEX/GRAPH, leaves nodes untouched', async () => {
    writeNode(sandbox, 'practice', 'practice-foo');
    const file = writeConflicts(sandbox, [makeConflict()]);
    const nodePath = join(sandbox, '.ai/knowledge-base/nodes/practice/practice-foo.md');
    const before = readFileSync(nodePath, 'utf8');

    const result = await runCli(sandbox, [
      'conflict',
      'resolve',
      '01HZZZZZZZZZZZZZZZZZZZZ001',
      '--action',
      'reject',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('rejected 01HZZZZZZZZZZZZZZZZZZZZ001');
    expect(readFileSync(nodePath, 'utf8')).toBe(before);

    const remaining = JSON.parse(readFileSync(file, 'utf8')) as {
      conflicts: ConflictFixture[];
    };
    expect(remaining.conflicts).toEqual([]);

    expect(existsSync(join(sandbox, '.ai/knowledge-base/INDEX.md'))).toBe(true);
    expect(existsSync(join(sandbox, '.ai/knowledge-base/GRAPH.md'))).toBe(true);
  });

  it('exits non-zero on an unknown conflict id and does not mutate pending-conflicts.json', async () => {
    writeNode(sandbox, 'practice', 'practice-foo');
    const file = writeConflicts(sandbox, [makeConflict()]);
    const before = readFileSync(file, 'utf8');

    const result = await runCli(sandbox, [
      'conflict',
      'resolve',
      'does-not-exist',
      '--action',
      'reject',
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr + result.stdout).toContain('unknown conflict id does-not-exist');
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('--action replace exits non-zero when the target node file is missing on disk', async () => {
    // Note: no writeNode call — target file is absent.
    const file = writeConflicts(sandbox, [makeConflict()]);
    const before = readFileSync(file, 'utf8');

    const result = await runCli(sandbox, [
      'conflict',
      'resolve',
      '01HZZZZZZZZZZZZZZZZZZZZ001',
      '--action',
      'replace',
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr + result.stdout).toContain(
      'replace target practice-foo.md missing on disk'
    );
    // No partial mutation: entry must still be present.
    expect(readFileSync(file, 'utf8')).toBe(before);
    // No node was written.
    expect(
      existsSync(join(sandbox, '.ai/knowledge-base/nodes/practice/practice-foo.md'))
    ).toBe(false);
  });
});
