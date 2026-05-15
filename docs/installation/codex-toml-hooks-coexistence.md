---
title: Codex hooks coexistence
parent: Installation
nav_order: 1
---

# Coexisting with an existing `.codex/config.toml [hooks]` table

When you run `npx @e0ipso/ai-knowledge-base init --harnesses codex`, the installer writes its hook registration to `.codex/hooks.json`. If your repo already declares a `[hooks]` table inside `.codex/config.toml`, the installer refuses to write and surfaces an error pointing here. Codex treats both locations as authoritative, so mixing them is undefined behavior; we fail loudly rather than silently overwrite either side.

## Why we cannot auto-merge

We never rewrite your `.codex/config.toml`. Round-tripping TOML loses comments, ordering, and whitespace, and `[hooks]` blocks are frequently annotated with comments explaining what each entry does. A non-destructive merge would require a comment-preserving TOML editor; rather than ship that, we ask you to merge by hand once and move on.

After the merge, the installer keeps writing to `.codex/hooks.json` for files we own. You retain full control of `.codex/config.toml`.

## Before: your existing `.codex/config.toml`

```toml
# Example: your repo already declares two hooks inline.

[hooks]

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = "scripts/notify-stop.sh"
timeout = 30

[[hooks.SessionStart]]
[[hooks.SessionStart.hooks]]
type = "command"
command = "scripts/welcome.sh"
timeout = 30
```

## After: the merged TOML

Append our four entries (capture and lint tick on `Stop`, session-start injection and proposal drain on `SessionStart`) to the existing arrays. Keep your entries; do not delete `.codex/hooks.json` if it already exists, but for the manual-merge path you want a single source of truth, so move our entries into `config.toml` and then delete `.codex/hooks.json`.

```toml
[hooks]

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = "scripts/notify-stop.sh"
timeout = 30

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = "node ./.codex/hooks/kb-capture.mjs"
timeout = 30

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = "node ./.codex/hooks/kb-lint-tick.mjs"
timeout = 30

[[hooks.SessionStart]]
[[hooks.SessionStart.hooks]]
type = "command"
command = "scripts/welcome.sh"
timeout = 30

[[hooks.SessionStart]]
[[hooks.SessionStart.hooks]]
type = "command"
command = "node ./.codex/hooks/kb-session-start.mjs"
timeout = 30

[[hooks.SessionStart]]
[[hooks.SessionStart.hooks]]
type = "command"
command = "node ./.codex/hooks/kb-proposal-drain.mjs"
timeout = 30
```

After saving the merged file, delete `.codex/hooks.json` so Codex sees a single hooks declaration. Re-running `npx @e0ipso/ai-knowledge-base init --harnesses codex --upgrade` will still refuse to recreate `.codex/hooks.json` while a populated `[hooks]` table exists in `config.toml`; upgrades to the hook scripts themselves (`./.codex/hooks/*.mjs`) keep working because those files are written from the bundled templates and are independent of where the registration lives.

## Removing our entries later

If you later want to uninstall the Codex adapter, drop the four `node ./.codex/hooks/kb-*` entries from `config.toml` (they are the only ones whose command starts with that prefix), then delete `.codex/hooks/` and `.agents/skills/kb-*/`.
