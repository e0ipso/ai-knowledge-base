---
title: Troubleshooting
nav_order: 6
---

# Troubleshooting

Start with `ai-knowledge-base doctor --verbose`.

## Nothing is being captured

`.ai/knowledge-base/_sessions/` stays empty.

- **Hooks aren't registered.** Check `.claude/settings.json` for the KB hook entries. Re-run `init --force` if missing.
- **gitleaks isn't on PATH.** Capture refuses to write without it. Run `pre-commit install`.
- **A wrapper script around `claude` leaked the internal flag** (`KB_BUILDER_INTERNAL=1`) into a normal session.

## Captured sessions never get extracted

Session logs are stuck pending.

- Background extraction runs at the start of the **next** Claude Code session. Open a new one.
- Make sure `claude` is on PATH in the shell that runs the hook.
- A stale lock can block extraction. Check `.ai/knowledge-base/.state/state.json`; wait for the TTL (30 min) or clear the `lock` field manually.

## `curate` says "no pending sessions"

Either everything is already curated, or some session logs have invalid frontmatter and are being silently skipped. Run `doctor`.

## `INDEX.md` is stale

`doctor` reports a hash drift. Cause: someone hand-edited or rebased `nodes/` without running the curator.

Fix:

```sh
ai-knowledge-base index rebuild
```

## Curator produces weird proposals

The prompt has drifted from your project's needs. Edit `.ai/knowledge-base/.state/prompts/curator.md` and bump its `Version:` comment. See [Customization](internals/prompts.md).

## Bootstrap re-processes done docs

`bootstrap-state.json` keys on file content hash. Causes:

- The file was actually modified (even whitespace).
- The state file was deleted or is malformed.

## Logs directory keeps growing

`_logs/` is gitignored but unbounded. Prune periodically:

```sh
ai-knowledge-base logs prune --older-than 2w
```

## Can't accept a contradiction

Contradictions require a resolution before they can be accepted. In `proposals review`, choose `supersede`, `keep_both`, or `reject` first.

## When all else fails

```sh
ai-knowledge-base doctor --verbose
cat .ai/knowledge-base/.state/state.json
cat .ai/knowledge-base/_sessions/.queue.json
ls .ai/knowledge-base/_logs/*/
```

Then [file an issue](https://github.com/e0ipso/ai-knowledge-base/issues).
