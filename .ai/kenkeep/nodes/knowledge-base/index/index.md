---
schema_version: 2
nodes_hash: 'sha256:05556c346e86a9e03179dd7bedd35c7f5d9f7572e7655ba4dff41947f198ab92'
node_count: 4
---
# kenkeep Index: knowledge-base / index

_4 node(s) in this folder • ~1094 estimated tokens_

## Subfolders
_None._

## Conventions (how we build)
- **Determinism contract for INDEX/GRAPH generation** [`knowledge-base/index/practice-determinism-contract.md`] computeNodesHash, generateIndex, generateGraph, slugify, deriveNodeId, ensureUniqueId are pure functions. Only randomness is crypto.randomUUID() for run_id. #determinism #indexing #testing

## Components (what exists)
- **INDEX.md** [`knowledge-base/index/map-index-md.md`] Catalog of every node (title, path, tags). Regenerated deterministically from nodes/. Injected into every new session by kk-session-start.mjs. #index #deterministic #sessionstart
- **GRAPH.md** [`knowledge-base/index/map-graph-md.md`] Full edge listing derived from every node's relates_to and depends_on. Not injected; harness reads on demand. #graph #deterministic
- **nodes_hash algorithm** [`knowledge-base/index/map-nodes-hash.md`] Content-addressed, mtime-independent SHA-256 hash of the nodes/ tree. Defined in computeNodesHash (src/lib/nodes.ts). #hash #deterministic #sha256

## By topic

- **#deterministic (3):** INDEX.md, GRAPH.md, nodes_hash algorithm
- **#determinism (1):** Determinism contract for INDEX/GRAPH generation
- **#graph (1):** GRAPH.md
- **#hash (1):** nodes_hash algorithm
- **#index (1):** INDEX.md
- **#indexing (1):** Determinism contract for INDEX/GRAPH generation
- **#sessionstart (1):** INDEX.md
- **#sha256 (1):** nodes_hash algorithm
- **#testing (1):** Determinism contract for INDEX/GRAPH generation
