---
title: CLI commands
parent: Reference
nav_order: 1
---

# CLI commands

The package installs an `ai-knowledge-base` binary. After `npm install -g @e0ipso/ai-knowledge-base` (or via `npx`), every subcommand documented below is available.

## `init`

```sh
ai-knowledge-base init --assistants <list> [--force]
```

First-time setup for a repo. Copies the directory skeleton, slash commands, and pre-commit config; writes `.ai/.kb-builder/installed-version`.

Flags:

- `-a, --assistants <list>` (required) — comma-separated list of AI assistants to wire up. v1 supports `claude` only; the list form exists for forward compatibility.
- `-f, --force` — overwrite existing files. Without this flag, re-running `init` on an already-initialized repo exits with a notice and does nothing.

## `doctor`

```sh
ai-knowledge-base doctor [--verbose]
```

Verify the installation. Checks Node version, the `claude` CLI, gitleaks, the installed-version marker, the pre-commit config, and the gitignore block. Exits 0 if there are no errors (warnings are allowed). Exits 1 if any check fails.

## `status`

```sh
ai-knowledge-base status
```

Print a summary of pending work — queue depth, pending session logs, pending proposals, current node counts.

## Commands available in later phases

| Command | Phase |
|---|---|
| `node add` | M3 |
| `curate` | M3 |
| `proposals review` | M3 |
| `bootstrap-incremental` | M3.5 |
| `index rebuild` | M4 / M5 |

When those phases ship, this page will document each subcommand's full flag set and exit codes.
