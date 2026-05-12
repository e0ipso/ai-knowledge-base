---
schema_version: 2
id: map-dedup-cache
title: 'dedup-cache: sha256-of-slice cache with 5-minute TTL'
kind: map
tags:
  - dedup
  - kb-pipeline
  - cache
valid_from: '2026-05-12T14:51:02.976Z'
valid_until: null
updated: '2026-05-12T15:50:15.076Z'
supersedes: null
superseded_by: null
derived_from:
  - 20260512-1438-e5b4618a5295.md
relates_to:
  - map-kb-capture-hook
  - practice-one-session-log-per-session-id
depends_on: []
confidence: high
summary: >-
  `dedup-cache.ts` keys captures on `sha256(slice)` to suppress exact-duplicate
  writes (e.g. Stop+SessionEnd back-to-back).
---
`dedup-cache.ts` (persisted as `.dedup-cache.json`) records `sha256(slice)` with a 5-minute TTL. It prevents the exact same transcript from being captured twice, such as when Stop and SessionEnd fire back-to-back with no new content in between.

It does NOT prevent per-turn duplication, because each new turn changes the hash; that case is handled by the `session_id`-based file and queue lookup instead.
