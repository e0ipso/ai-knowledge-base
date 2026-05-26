---
schema_version: 1
id: practice-hook-status-messages-include-kb-prefix-after-emoji
title: Hook status messages include KB prefix after emoji
kind: practice
tags:
  - hooks
  - messaging
  - ux
derived_from: []
relates_to:
  - map-capture-hook
  - map-session-start-hook
  - map-proposal-drain-hook
  - map-claude-harness
confidence: high
summary: >-
  All user-facing hook messages follow the pattern emoji KB Label: message to
  identify the knowledge base as the source.
---
Every user-facing status message emitted by harness hooks (session-start, lint-tick, capture, proposal-drain) includes "KB" between the leading emoji and the label. For example: `📖 KB Index: Loading knowledge base...`, `🔍 KB Lint: Running knowledge base lint...`, `📸 KB Capture: Saving session transcript...`, `🔄 KB Proposals: Draining queue...`.

This convention applies across all four harness adapters (Claude, Codex, Cursor, OpenCode). The prefix helps users distinguish messages originating from the knowledge base system from those of other tools or extensions. Error diagnostics that use `PACKAGE_TAG` (`[ai-knowledge-base]`) are not affected by this rule.
