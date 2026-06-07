---
schema_version: 2
nodes_hash: 'sha256:856783d21fe666a5a03df1d1d07cdde3009866845828be912c7628fa3c6b717c'
node_count: 3
---
# kenkeep Index: knowledge-base / state

_3 node(s) in this folder • ~1082 estimated tokens_

## Subfolders
_None._

## Conventions (how we build)
_None yet._

## Components (what exists)
- **config.yaml (project settings)** [`knowledge-base/state/map-config-yaml.md`] Committed project settings at .ai/kenkeep/config.yaml. Strict: unknown keys are a hard error. #config #settings #model
- **Session log (_sessions/*.md)** [`knowledge-base/state/map-session-log.md`] Per-session checkpoint at _sessions/<YYYYMMDD-HHmm-id>.md; one file per session_id; frontmatter tracks capture, proposal, and curator phases. #session #capture #state #schema
- **.state/state.json (lock + nudge state)** [`knowledge-base/state/map-state-file.md`] Gitignored runtime state. Holds one lock at a time (30-min TTL, stale locks reclaimed) and last_nudged_at. #state #lock #schema

## By topic

- **#schema (2):** Session log (_sessions/*.md), .state/state.json (lock + nudge state)
- **#state (2):** Session log (_sessions/*.md), .state/state.json (lock + nudge state)
- **#capture (1):** Session log (_sessions/*.md)
- **#config (1):** config.yaml (project settings)
- **#lock (1):** .state/state.json (lock + nudge state)
- **#model (1):** config.yaml (project settings)
- **#session (1):** Session log (_sessions/*.md)
- **#settings (1):** config.yaml (project settings)
