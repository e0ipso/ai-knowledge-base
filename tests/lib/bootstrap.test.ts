import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import lockfile from 'proper-lockfile';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ignore from 'ignore';
import {
  buildChunkString,
  buildPrompt,
  CHUNK_PLACEHOLDER,
  discoverMarkdownFiles,
  readBootstrapState,
  runBootstrapIncremental,
  sha256Hex,
  writeBootstrapState,
  type BootstrapRunner,
} from '../../src/lib/bootstrap.js';
import { repoPaths, type RepoPaths } from '../../src/lib/paths.js';
import type {
  BootstrapCandidate,
  BootstrapOutput,
  NodeFrontmatter,
} from '../../src/lib/schemas.js';
import { STATE_LOCK_OPTIONS } from '../../src/lib/state.js';

interface Harness {
  root: string;
  sourceDir: string;
  paths: RepoPaths;
  nodesDir: string;
  stateFile: string;
  bootstrapStateFile: string;
}

function makeHarness(): Harness {
  const root = mkdtempSync(join(tmpdir(), 'kb-bootstrap-'));
  const sourceDir = join(root, 'docs');
  const paths = repoPaths(root);
  const stateFile = join(paths.stateDir, 'state.json');
  const bootstrapStateFile = join(paths.stateDir, 'bootstrap-state.json');
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(paths.nodesDir, { recursive: true });
  mkdirSync(paths.logsDir, { recursive: true });
  mkdirSync(paths.stateDir, { recursive: true });
  // The real `init` command writes a `.kbignore` excluding `.ai/` so the
  // bootstrap walk does not re-ingest its own node files. Mirror that
  // setup here so `runBootstrapIncremental` tests reflect realistic use.
  writeFileSync(join(root, '.kbignore'), '.ai/\n');
  return {
    root,
    sourceDir,
    paths,
    nodesDir: paths.nodesDir,
    stateFile,
    bootstrapStateFile,
  };
}

const PROMPT_TEMPLATE = 'Extract.\n\n[CHUNK PLACEHOLDER, substituted at runtime]';

function makeCandidate(kind: 'practice' | 'map', title: string): BootstrapCandidate {
  return {
    kind,
    tags: ['t'],
    title,
    summary: `summary of ${title}`,
    body: `# ${title}\n\nBody for ${title}.`,
    confidence: 'medium',
    supports_existing_node: null,
    contradicts_existing_node: null,
  };
}

function runnerOf(output: BootstrapOutput | BootstrapOutput[]): BootstrapRunner {
  const queue: BootstrapOutput[] = Array.isArray(output) ? [...output] : [output];
  return (async () => {
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return next!;
  }) as BootstrapRunner;
}

function ctxFor(harness: Harness, runner: BootstrapRunner) {
  return {
    paths: harness.paths,
    promptTemplate: PROMPT_TEMPLATE,
    runner,
  };
}

describe('sha256Hex', () => {
  it('is stable and matches a known value', () => {
    expect(sha256Hex('hello\n')).toBe(
      '5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03'
    );
  });
});

describe('discoverMarkdownFiles', () => {
  let harness: Harness;
  beforeEach(() => (harness = makeHarness()));
  afterEach(() => rmSync(harness.root, { recursive: true, force: true }));

  it('walks repo root and returns repo-relative posix paths sorted', () => {
    writeFileSync(join(harness.sourceDir, 'README.md'), '# r');
    mkdirSync(join(harness.sourceDir, 'sub'), { recursive: true });
    writeFileSync(join(harness.sourceDir, 'sub', 'a.md'), 'a');
    writeFileSync(join(harness.sourceDir, 'sub', 'b.txt'), 'ignored'); // non-md
    writeFileSync(join(harness.root, 'top.md'), 't');
    const got = discoverMarkdownFiles({ repoRoot: harness.root });
    expect(got.files).toEqual(['docs/README.md', 'docs/sub/a.md', 'top.md']);
    expect(got.scannedBeforeFilter).toBe(3);
  });

  it('reports scannedBeforeFilter as the post-descent, pre-filter walker count', () => {
    // STATIC_SKIPS / .gitignore / .kbignore *file* filtering is post-walk;
    // the pre-filter count should include LICENSE.md (a static skip) but
    // exclude .git/ and node_modules/ which never get descended.
    writeFileSync(join(harness.root, 'intro.md'), 'i');
    writeFileSync(join(harness.root, 'LICENSE.md'), 'l');
    mkdirSync(join(harness.root, 'node_modules'), { recursive: true });
    writeFileSync(join(harness.root, 'node_modules', 'noisy.md'), 'n');
    mkdirSync(join(harness.root, '.git'), { recursive: true });
    writeFileSync(join(harness.root, '.git', 'config.md'), 'g');
    const got = discoverMarkdownFiles({ repoRoot: harness.root });
    expect(got.files).toEqual(['intro.md']);
    // intro.md + LICENSE.md (LICENSE.md gets filtered by STATIC_SKIPS,
    // but it was scanned). node_modules/.git are not descended.
    // docs/ exists but is empty so contributes nothing.
    expect(got.scannedBeforeFilter).toBe(2);
  });

  it('applies STATIC_SKIPS unconditionally (no opt-in inversion)', () => {
    writeFileSync(join(harness.root, 'intro.md'), 'i');
    writeFileSync(join(harness.root, 'LICENSE.md'), 'l');
    writeFileSync(join(harness.root, 'LICENSE'), 'l');
    writeFileSync(join(harness.root, 'COPYING'), 'c');
    writeFileSync(join(harness.root, 'NOTICE.md'), 'n');
    writeFileSync(join(harness.root, 'CODE_OF_CONDUCT.md'), 'c');
    writeFileSync(join(harness.root, 'CONTRIBUTORS.md'), 'c');
    writeFileSync(join(harness.root, 'AUTHORS.md'), 'a');
    writeFileSync(join(harness.root, 'MAINTAINERS.md'), 'm');
    writeFileSync(join(harness.root, 'CHANGELOG.md'), 'c');
    writeFileSync(join(harness.root, 'CHANGES.md'), 'c');
    writeFileSync(join(harness.root, 'HISTORY.md'), 'h');
    writeFileSync(join(harness.root, 'RELEASE_NOTES.md'), 'r');
    writeFileSync(join(harness.root, 'INDEX.md'), 'i');
    writeFileSync(join(harness.root, 'GRAPH.md'), 'g');
    mkdirSync(join(harness.root, 'releases'), { recursive: true });
    writeFileSync(join(harness.root, 'releases', 'v1.md'), 'v1');
    const got = discoverMarkdownFiles({ repoRoot: harness.root });
    expect(got.files).toEqual(['intro.md']);
  });

  it('respects gitignore patterns', () => {
    writeFileSync(join(harness.sourceDir, 'keep.md'), 'k');
    mkdirSync(join(harness.sourceDir, 'legacy'), { recursive: true });
    writeFileSync(join(harness.sourceDir, 'legacy', 'skip.md'), 's');
    const got = discoverMarkdownFiles({
      repoRoot: harness.root,
      gitignore: ignore().add('docs/legacy'),
    });
    expect(got.files).toEqual(['docs/keep.md']);
  });

  it('honours .gitignore negation patterns', () => {
    writeFileSync(join(harness.sourceDir, 'keep.md'), 'k');
    writeFileSync(join(harness.sourceDir, 'drop.md'), 'd');
    const got = discoverMarkdownFiles({
      repoRoot: harness.root,
      gitignore: ignore().add('docs/*.md\n!docs/keep.md'),
    });
    expect(got.files).toEqual(['docs/keep.md']);
  });

  it('respects .kbignore directory excludes', () => {
    writeFileSync(join(harness.sourceDir, 'keep.md'), 'k');
    mkdirSync(join(harness.root, 'vendor'), { recursive: true });
    writeFileSync(join(harness.root, 'vendor', 'lib.md'), 'l');
    const got = discoverMarkdownFiles({
      repoRoot: harness.root,
      kbignore: ignore().add('vendor/'),
    });
    expect(got.files).toEqual(['docs/keep.md']);
  });

  it('honours .kbignore un-ignoring a file under a non-excluded parent', () => {
    // Pattern: ignore everything, then re-admit docs/ and docs/AGENTS.md.
    writeFileSync(join(harness.sourceDir, 'AGENTS.md'), 'a');
    writeFileSync(join(harness.sourceDir, 'other.md'), 'o');
    writeFileSync(join(harness.root, 'intro.md'), 'i');
    const got = discoverMarkdownFiles({
      repoRoot: harness.root,
      kbignore: ignore().add('*\n!docs/\n!docs/AGENTS.md'),
    });
    expect(got.files).toEqual(['docs/AGENTS.md']);
  });

  it('composes .gitignore ∪ .kbignore (either blocks)', () => {
    writeFileSync(join(harness.sourceDir, 'keep.md'), 'k');
    writeFileSync(join(harness.sourceDir, 'gitignored.md'), 'g');
    writeFileSync(join(harness.sourceDir, 'kbignored.md'), 'b');
    const got = discoverMarkdownFiles({
      repoRoot: harness.root,
      gitignore: ignore().add('docs/gitignored.md'),
      kbignore: ignore().add('docs/kbignored.md'),
    });
    expect(got.files).toEqual(['docs/keep.md']);
  });

  it('short-circuits descent for .kbignore-excluded directories (perf)', () => {
    writeFileSync(join(harness.root, 'intro.md'), 'i');
    mkdirSync(join(harness.root, 'huge'), { recursive: true });
    writeFileSync(join(harness.root, 'huge', 'a.md'), 'a');
    writeFileSync(join(harness.root, 'huge', 'b.md'), 'b');
    const got = discoverMarkdownFiles({
      repoRoot: harness.root,
      kbignore: ignore().add('huge/'),
    });
    expect(got.files).toEqual(['intro.md']);
    // Critically: the walker did NOT descend into huge/, so those .md
    // files are not counted in scannedBeforeFilter.
    expect(got.scannedBeforeFilter).toBe(1);
  });

  it('short-circuits descent for .gitignore-excluded directories (perf)', () => {
    writeFileSync(join(harness.root, 'intro.md'), 'i');
    mkdirSync(join(harness.root, 'build'), { recursive: true });
    writeFileSync(join(harness.root, 'build', 'a.md'), 'a');
    writeFileSync(join(harness.root, 'build', 'b.md'), 'b');
    const got = discoverMarkdownFiles({
      repoRoot: harness.root,
      gitignore: ignore().add('build/'),
    });
    expect(got.files).toEqual(['intro.md']);
    expect(got.scannedBeforeFilter).toBe(1);
  });

  it('does not auto-skip harness instruction directories (lib alone, no .kbignore stub)', () => {
    // Once .kbignore replaces extraStaticSkips, the lib's discovery does
    // NOT know about harness skills/commands dirs. The default stub
    // written by `init` is what excludes them; the lib alone is harness-
    // agnostic.
    writeFileSync(join(harness.root, 'intro.md'), 'i');
    mkdirSync(join(harness.root, '.claude', 'skills', 'foo'), { recursive: true });
    writeFileSync(join(harness.root, '.claude', 'skills', 'foo', 'SKILL.md'), 's');
    mkdirSync(join(harness.root, '.claude', 'commands'), { recursive: true });
    writeFileSync(join(harness.root, '.claude', 'commands', 'bar.md'), 'b');
    const got = discoverMarkdownFiles({ repoRoot: harness.root });
    expect(got.files).toEqual([
      '.claude/commands/bar.md',
      '.claude/skills/foo/SKILL.md',
      'intro.md',
    ]);
  });

  it('does not filter files that only share a prefix with a static skip', () => {
    writeFileSync(join(harness.root, 'CHANGELOG_FORMAT.md'), 'cf');
    writeFileSync(join(harness.root, 'LICENSE_HEADER.md'), 'lh');
    writeFileSync(join(harness.root, 'licensing-policy.md'), 'lp');
    const got = discoverMarkdownFiles({ repoRoot: harness.root });
    expect(got.files).toEqual([
      'CHANGELOG_FORMAT.md',
      'LICENSE_HEADER.md',
      'licensing-policy.md',
    ]);
  });
});

describe('buildChunkString', () => {
  it('emits FILE/END FILE delimited blocks', () => {
    const out = buildChunkString([
      { relPath: 'docs/a.md', absPath: '/x', sha256: 'h', content: '# A\nbody' },
      { relPath: 'docs/b.md', absPath: '/y', sha256: 'h', content: 'B' },
    ]);
    expect(out).toContain('=== FILE: docs/a.md ===');
    expect(out).toContain('=== END FILE ===');
    expect(out).toContain('=== FILE: docs/b.md ===');
  });
});

describe('readBootstrapState / writeBootstrapState', () => {
  let harness: Harness;
  beforeEach(() => (harness = makeHarness()));
  afterEach(() => rmSync(harness.root, { recursive: true, force: true }));

  it('returns an empty state when the file is missing', () => {
    const s = readBootstrapState(harness.bootstrapStateFile);
    expect(s.schema_version).toBe(1);
    expect(s.docs).toEqual({});
  });

  it('round-trips a written state', () => {
    writeBootstrapState(harness.bootstrapStateFile, {
      schema_version: 1,
      last_full_bootstrap_at: null,
      last_incremental_at: '2026-05-12T10:00:00Z',
      docs: {
        'docs/a.md': {
          content_sha256: 'abc',
          last_processed_at: '2026-05-12T10:00:00Z',
          produced_nodes: ['practice/practice-a.md'],
        },
      },
    });
    const got = readBootstrapState(harness.bootstrapStateFile);
    expect(got.docs['docs/a.md']?.content_sha256).toBe('abc');
    expect(got.docs['docs/a.md']?.produced_nodes).toEqual(['practice/practice-a.md']);
  });
});

describe('runBootstrapIncremental', () => {
  let harness: Harness;
  beforeEach(() => (harness = makeHarness()));
  afterEach(() => rmSync(harness.root, { recursive: true, force: true }));

  it('writes new nodes for each candidate and updates state', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), '# A\nUse X always.');
    writeFileSync(join(harness.sourceDir, 'b.md'), '# B\nBravo is a service.');
    const queue: BootstrapOutput[] = [
      { practice: [makeCandidate('practice', 'Use X')], map: [] },
      { practice: [], map: [makeCandidate('map', 'Bravo Service')] },
    ];
    const runner: BootstrapRunner = (async () => queue.shift()!) as BootstrapRunner;
    const result = await runBootstrapIncremental(ctxFor(harness, runner));
    expect(result.status).toBe('completed');
    expect(result.batches).toBe(2);
    expect(result.nodesWritten).toBe(2);
    expect(result.skippedCollisions).toBe(0);
    expect(readdirSync(join(harness.nodesDir, 'practice'))).toEqual(['practice-use-x.md']);
    expect(readdirSync(join(harness.nodesDir, 'map'))).toEqual(['map-bravo-service.md']);

    const nodeFile = join(harness.nodesDir, 'practice', 'practice-use-x.md');
    const parsed = matter(readFileSync(nodeFile, 'utf8'));
    const fm = parsed.data as NodeFrontmatter;
    expect(fm.derived_from).toEqual(['docs/a.md']);
    expect(fm.confidence).toBe('medium');
    // No proposal: block in the new architecture.
    expect(parsed.data).not.toHaveProperty('proposal');

    const state = readBootstrapState(harness.bootstrapStateFile);
    expect(state.docs['docs/a.md']?.content_sha256).toBeDefined();
    expect(state.docs['docs/b.md']?.produced_nodes).toContain('map/map-bravo-service.md');
  });

  it('skips a candidate whose target node already exists on disk', async () => {
    // Pre-create the node bootstrap would otherwise write.
    mkdirSync(join(harness.nodesDir, 'practice'), { recursive: true });
    writeFileSync(
      join(harness.nodesDir, 'practice', 'practice-use-x.md'),
      matter.stringify('# old\n', {
        schema_version: 1,
        id: 'practice-use-x',
        title: 'Use X',
        kind: 'practice',
        tags: [],
        derived_from: [],
        relates_to: [],
        confidence: 'high',
        summary: 's',
      })
    );
    writeFileSync(join(harness.sourceDir, 'a.md'), '# A');
    const runner = runnerOf({
      practice: [makeCandidate('practice', 'Use X')],
      map: [],
    });
    const result = await runBootstrapIncremental(ctxFor(harness, runner));
    expect(result.nodesWritten).toBe(0);
    expect(result.skippedCollisions).toBe(1);
    // Existing node not overwritten.
    expect(readFileSync(join(harness.nodesDir, 'practice', 'practice-use-x.md'), 'utf8')).toContain(
      'old'
    );
  });

  it('skips docs whose hash matches the recorded state', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), 'unchanged');
    const sha = sha256Hex('unchanged');
    writeBootstrapState(harness.bootstrapStateFile, {
      schema_version: 1,
      docs: {
        'docs/a.md': {
          content_sha256: sha,
          last_processed_at: '2026-05-12T09:00:00Z',
          produced_nodes: [],
        },
      },
    });
    let runnerCalled = 0;
    const runner: BootstrapRunner = (async () => {
      runnerCalled += 1;
      return { practice: [], map: [] };
    }) as BootstrapRunner;
    const result = await runBootstrapIncremental(ctxFor(harness, runner));
    expect(result.status).toBe('completed');
    expect(result.unchanged).toBe(1);
    expect(result.nodesWritten).toBe(0);
    expect(runnerCalled).toBe(0);
  });

  it('dry-run reports what would be processed without invoking the runner or writing nodes', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), 'a');
    writeFileSync(join(harness.sourceDir, 'b.md'), 'b');
    let runnerCalled = 0;
    const runner: BootstrapRunner = (async () => {
      runnerCalled += 1;
      return { practice: [], map: [] };
    }) as BootstrapRunner;
    const result = await runBootstrapIncremental({
      ...ctxFor(harness, runner),
      dryRun: true,
    });
    expect(result.status).toBe('completed');
    expect(runnerCalled).toBe(0);
    expect(result.nodesWritten).toBe(0);
    expect(result.processed.filter(p => p.status === 'skipped-dry-run')).toHaveLength(2);
    // Did not create nodes on disk.
    const practiceDir = join(harness.nodesDir, 'practice');
    const hasNodes = existsSync(practiceDir) && readdirSync(practiceDir).length > 0;
    expect(hasNodes).toBe(false);
    // Did not mutate the bootstrap state.
    expect(existsSync(harness.bootstrapStateFile)).toBe(false);
  });

  it('returns status=locked when another process holds the lock', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), 'a');
    mkdirSync(join(harness.paths.stateDir), { recursive: true });
    const release = await lockfile.lock(harness.stateFile, STATE_LOCK_OPTIONS);
    try {
      const result = await runBootstrapIncremental(
        ctxFor(harness, runnerOf({ practice: [], map: [] }))
      );
      expect(result.status).toBe('locked');
    } finally {
      await release();
    }
  });

  it('releases the lock after completion', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), 'a');
    await runBootstrapIncremental(ctxFor(harness, runnerOf({ practice: [], map: [] })));
    const release = await lockfile.lock(harness.stateFile, STATE_LOCK_OPTIONS);
    await release();
  });

  it('records failures but does not update state for the failed doc', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), 'a');
    const failing: BootstrapRunner = (async () => {
      throw new Error('boom');
    }) as BootstrapRunner;
    const result = await runBootstrapIncremental(ctxFor(harness, failing));
    expect(result.nodesWritten).toBe(0);
    expect(result.processed[0]?.status).toBe('failed');
    expect(result.processed[0]?.error).toContain('boom');
    const state = readBootstrapState(harness.bootstrapStateFile);
    expect(state.docs['docs/a.md']).toBeUndefined();
  });

  it('attributes derived_from to the single-file batch source', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), '# A');
    const runner = runnerOf({
      practice: [makeCandidate('practice', 'Use X')],
      map: [],
    });
    await runBootstrapIncremental(ctxFor(harness, runner));
    const nodeFile = join(harness.nodesDir, 'practice', 'practice-use-x.md');
    const fm = matter(readFileSync(nodeFile, 'utf8')).data as NodeFrontmatter;
    expect(fm.derived_from).toEqual(['docs/a.md']);
  });

  it('produces one batch per file (single-file batching)', async () => {
    for (let i = 0; i < 3; i += 1) {
      writeFileSync(join(harness.sourceDir, `doc-${i}.md`), `# ${i}\n`);
    }
    const batchSizes: number[] = [];
    const filePaths: string[][] = [];
    const runner: BootstrapRunner = (async (prompt: string) => {
      const matches = prompt.match(/=== FILE: ([^=]+?) ===/g) ?? [];
      batchSizes.push(matches.length);
      filePaths.push(matches.map(m => m.replace(/=== FILE: | ===/g, '').trim()));
      return { practice: [], map: [] };
    }) as BootstrapRunner;
    const result = await runBootstrapIncremental(ctxFor(harness, runner));
    expect(result.batches).toBe(3);
    expect(batchSizes).toEqual([1, 1, 1]);
    expect(filePaths.flat().sort()).toEqual(['docs/doc-0.md', 'docs/doc-1.md', 'docs/doc-2.md']);
  });

  it('attributes derived_from deterministically per file across N single-file batches', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), '# A');
    writeFileSync(join(harness.sourceDir, 'b.md'), '# B');
    writeFileSync(join(harness.sourceDir, 'c.md'), '# C');
    let call = 0;
    const titles = ['From A', 'From B', 'From C'];
    const runner: BootstrapRunner = (async () => {
      const title = titles[call++]!;
      return { practice: [makeCandidate('practice', title)], map: [] };
    }) as BootstrapRunner;
    const result = await runBootstrapIncremental(ctxFor(harness, runner));
    expect(result.batches).toBe(3);
    expect(result.nodesWritten).toBe(3);
    const byTitle: Record<string, string[]> = {};
    for (const f of readdirSync(join(harness.nodesDir, 'practice'))) {
      const fm = matter(readFileSync(join(harness.nodesDir, 'practice', f), 'utf8'))
        .data as NodeFrontmatter;
      byTitle[fm.title] = fm.derived_from;
    }
    expect(byTitle['From A']).toEqual(['docs/a.md']);
    expect(byTitle['From B']).toEqual(['docs/b.md']);
    expect(byTitle['From C']).toEqual(['docs/c.md']);
  });

  it('interleaves memory candidates with markdown candidates and produces nodes for both', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), '# A');
    const memoryCandidate = {
      relPath: 'memory://user_role.md',
      absPath: '/synthetic/user_role.md',
      sha256: 'a'.repeat(64),
      content: '# user role\nbackend engineer',
    };
    let call = 0;
    const titles = ['From Markdown', 'From Memory'];
    const seenPaths: string[] = [];
    const runner: BootstrapRunner = (async (prompt: string) => {
      const m = prompt.match(/=== FILE: ([^=]+?) ===/);
      if (m) seenPaths.push(m[1]!.trim());
      const title = titles[call++]!;
      return { practice: [makeCandidate('practice', title)], map: [] };
    }) as BootstrapRunner;
    const result = await runBootstrapIncremental({
      ...ctxFor(harness, runner),
      memoryCandidates: [memoryCandidate],
    });
    expect(result.status).toBe('completed');
    expect(result.batches).toBe(2);
    expect(result.nodesWritten).toBe(2);
    expect(result.discovered).toBe(2);
    expect(seenPaths).toEqual(['docs/a.md', 'memory://user_role.md']);
    // The synthetic memory:// path must not leak into bootstrap-state.json,
    // which exists to track changes to markdown sources only.
    const state = readBootstrapState(harness.bootstrapStateFile);
    expect(Object.keys(state.docs)).toEqual(['docs/a.md']);
  });

  it('treats memory candidates as candidates when no markdown files exist', async () => {
    const memoryCandidate = {
      relPath: 'memory://only_memory.md',
      absPath: '/synthetic/only_memory.md',
      sha256: 'b'.repeat(64),
      content: 'just memory content',
    };
    const runner: BootstrapRunner = (async () => ({
      practice: [makeCandidate('practice', 'Memory Only')],
      map: [],
    })) as BootstrapRunner;
    const result = await runBootstrapIncremental({
      ...ctxFor(harness, runner),
      memoryCandidates: [memoryCandidate],
    });
    expect(result.status).toBe('completed');
    expect(result.nodesWritten).toBe(1);
  });

  it('honours collision-skip for memory candidates whose synthetic relPath maps onto an existing node', async () => {
    // Pre-create the node the LLM is about to ask us to write.
    mkdirSync(join(harness.nodesDir, 'practice'), { recursive: true });
    writeFileSync(
      join(harness.nodesDir, 'practice', 'practice-pre-existing.md'),
      matter.stringify('# already here\n', {
        schema_version: 1,
        id: 'practice-pre-existing',
        title: 'Pre Existing',
        kind: 'practice',
        tags: [],
        derived_from: [],
        relates_to: [],
        confidence: 'medium',
        summary: 's',
      })
    );
    const memoryCandidate = {
      relPath: 'memory://m.md',
      absPath: '/x/m.md',
      sha256: 'c'.repeat(64),
      content: 'memory body',
    };
    const runner = runnerOf({
      practice: [makeCandidate('practice', 'Pre Existing')],
      map: [],
    });
    const result = await runBootstrapIncremental({
      ...ctxFor(harness, runner),
      memoryCandidates: [memoryCandidate],
    });
    expect(result.skippedCollisions).toBe(1);
    expect(result.nodesWritten).toBe(0);
  });

  it('forwards harnessOpts to the runner when set, omits them otherwise', async () => {
    writeFileSync(join(harness.sourceDir, 'a.md'), '# A');
    let captured: Record<string, unknown> | undefined;
    const runner: BootstrapRunner = (async (_p, _s, _schema, opts) => {
      captured = opts.harnessOpts;
      return { practice: [], map: [] };
    }) as BootstrapRunner;
    await runBootstrapIncremental({
      ...ctxFor(harness, runner),
      harnessOpts: { model: 'sonnet', effort: 'high' },
    });
    expect(captured).toEqual({ model: 'sonnet', effort: 'high' });

    writeFileSync(join(harness.sourceDir, 'b.md'), '# B');
    captured = undefined;
    await runBootstrapIncremental(ctxFor(harness, runner));
    expect(captured).toBeUndefined();
  });
});

describe('buildPrompt', () => {
  it('substitutes the chunk placeholder when present', () => {
    const out = buildPrompt(`prefix ${CHUNK_PLACEHOLDER} suffix`, 'CHUNK');
    expect(out).toBe('prefix CHUNK suffix');
  });

  it('throws when the placeholder is missing, naming the placeholder and the bootstrap prompt', () => {
    expect(() => buildPrompt('no placeholder here', 'CHUNK')).toThrowError(
      new RegExp(
        `bootstrap prompt is missing the ${CHUNK_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      )
    );
  });
});
