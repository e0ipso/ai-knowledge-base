# Contributing to @e0ipso/ai-knowledge-base

Thanks for considering a contribution. This document is for maintainers and contributors to the npm package itself, not for end users of the tool. End-user docs live on the [docs site](docs/).

## Dev environment

Prerequisites:

- Node 22+
- npm 10+ (or pnpm 9+)
- Claude Code CLI on PATH for integration smoke tests (`claude --version`)
- No external binaries - the capture-hook secret scan runs [`secretlint`](https://github.com/secretlint/secretlint) programmatically from `node_modules`.

Git hooks are managed by [husky](https://typicode.github.io/husky/) and installed automatically by `npm install` (via the `prepare` script). The `pre-commit` hook runs [`lint-staged`](https://github.com/lint-staged/lint-staged), which in turn runs ESLint, Prettier, and secretlint on staged files, followed by `typecheck` and `test` across the project.

Set up:

```sh
git clone git@github.com:e0ipso/ai-knowledge-base.git
cd ai-knowledge-base
npm install
npm run build
```

`npm install` runs `prepare`, which builds templates and the CLI. After build, `node dist/cli.js --help` should work from the repo root.

## Project layout

```
src/
  cli.ts                          # commander entry, registers subcommands
  commands/                       # one file per subcommand (init, doctor, status, ...)
  adapters/
    types.ts                      # assistant-agnostic adapter contract
    claude.ts                     # Claude Code adapter implementation
  lib/                            # shared utilities (paths, log, version, ...)
  templates-source/               # source for the shipped templates/ directory
scripts/
  build-templates.mjs             # copies templates-source/ → templates/
templates/                        # built; bundled into the npm package
tests/
  fixtures/                       # transcripts and bootstrap docs used by integration tests
docs/                             # Jekyll/Just-the-Docs site, served via GitHub Pages
PRD.md                            # product requirements (authoritative)
```

## Running tests

```sh
npm test               # unit + integration with mocked `claude` subprocess
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run format:check   # prettier
```

### Manual test plan

Before a significant release - schema bump, capture/curate/consume behavior change, pinned Claude Code CLI bump - work through [`docs/internals/manual-test-plan.md`](docs/internals/manual-test-plan.md). It covers the checks that resist automation: per-platform smoke (macOS / Linux / WSL2 / native Windows), PreCompact timing on long sessions, real capture quality, `init --upgrade` from the previous published version, concurrent-pipeline locking, and a few intentionally-broken-state doctor exit-code checks. Record results in the release PR description.

## Schema-version bump policy

Every frontmatter and JSON state file in the system carries `schema_version: 1`. The policy is **strict**: any breaking change to the on-disk shape gets a clean break - there are no migrators, no compatibility shims, and no legacy code paths. Users on the old shape re-initialize.

Concretely:

- **Bump `schema_version: 1 → 2`** when: removing a field; renaming a field; changing the semantics of a field; making a previously-optional field required.
- **Do not bump** when: adding an optional field; adding a new enum case; relaxing a constraint.

When you bump, the reader rejects v1 files with a clear error directing the user to re-run `init`. Do not write a migrator.

## Prompt versioning

Each `src/templates-source/prompts/*.md` and `src/templates-source/claude/commands/*.md` carries a top-of-file `Version: N` comment. Bump the version when you change behavior. Prompt version is independent of the npm package version, but a prompt change must be noted in the changelog so users know to inspect the diff.

## Release process

Releases are automated via [semantic-release](https://semantic-release.gitbook.io/). Conventional commit messages (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`) determine the next version and changelog entry. Merging to `main` triggers the release pipeline; no manual tagging or `npm publish` is needed.

## Docs site preview

The docs site is Jekyll under `docs/`. To preview locally:

```sh
cd docs
bundle install
bundle exec jekyll serve
```

CI deploys on push to `main`.

## Submitting a PR

- One logical change per PR. Branch from `main`.
- Include doc updates alongside the code change in the same PR.
- Run `npm test`, `npm run typecheck`, and `npm run lint` before pushing.
- Conventional commit format on commit messages and the PR title.
