import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ignore from 'ignore';
import {
  discoverMarkdownFiles,
  readBootstrapState,
  sha256Hex,
  writeBootstrapState,
} from '../../src/lib/bootstrap.js';
import { repoPaths, type RepoPaths } from '../../src/lib/paths.js';

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
  // setup here so discovery tests reflect realistic use.
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
    // The lib's discovery does NOT know about harness skills/commands dirs.
    // The default `.kbignore` stub written by `init` is what excludes them;
    // the lib alone is harness-agnostic.
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
