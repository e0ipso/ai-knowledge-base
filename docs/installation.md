---
title: Installation
nav_order: 3
---

# Installation

## Prerequisites

- Node.js 22+
- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code/getting-started)
- [pre-commit](https://pre-commit.com) (`pip install pre-commit` or `brew install pre-commit`)
- [gitleaks](https://github.com/gitleaks/gitleaks) — installed automatically by `pre-commit install`

No Anthropic API key required. The tool uses `claude -p` and inherits your existing Claude Code auth.

## Install

In the root of your repository:

```sh
npx @e0ipso/ai-knowledge-base init --assistants claude
pre-commit install
ai-knowledge-base doctor
```

This creates:

- `.ai/knowledge-base/` — your knowledge base.
- `.claude/` — hooks and skills used by Claude Code.
- `.pre-commit-config.yaml` — wires up gitleaks.
- A managed block in `.gitignore`.

Commit everything.

## Verify

`ai-knowledge-base doctor` checks your Node version, that `claude` and `gitleaks` are on PATH, and that the installation looks healthy. Exits 0 when clean.

## Upgrading

When a new version of the package ships:

```sh
npm install --save-dev @e0ipso/ai-knowledge-base@latest
npx @e0ipso/ai-knowledge-base init --assistants claude --upgrade
ai-knowledge-base doctor
```

`--upgrade` refreshes hooks, skills, and bundled prompts but preserves your project config and any local prompt overrides. Add `--dry-run` to preview.
