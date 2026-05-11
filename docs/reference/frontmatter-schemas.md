---
title: Frontmatter schemas
parent: Reference
nav_order: 6
---

# Frontmatter schemas

Every YAML frontmatter block and every JSON state file is validated by a Zod schema at read time. The schemas live in [`src/lib/schemas.ts`](https://github.com/e0ipso/ai-knowledge-base/blob/main/src/lib/schemas.ts) and are the source of truth — when this page and the schema disagree, the schema wins.

All shapes carry `schema_version: 1`. v1 → v2 will ship a migration script under `src/lib/migrations/`; until then a `schema_version` mismatch is treated as a parse failure and the file is silently dropped (the runtime fails closed, never guesses).

## Node frontmatter (`nodes/{practice,map}/<slug>.md`)

```yaml
---
schema_version: 1
id: practice-prefer-constructor-injection      # `<kind>-<slug>`; slug from slugify(title)
title: "..."                                   # display title
kind: practice | map
tags: [string, ...]                            # 1-N short lowercase tags
valid_from: 2026-05-10T14:30:00Z               # ISO-8601
valid_until: null                              # ISO-8601 or null (= currently valid)
updated: 2026-05-10T14:30:00Z                  # last touched
supersedes: null                               # node id or null
superseded_by: null                            # node id or null
derived_from:                                  # source(s): session log filenames or doc paths
  - 20260510-1014-session-abc.md
relates_to: [string, ...]                      # loose links to other node ids
depends_on: [string, ...]                      # strict ordering links to other node ids
confidence: low | medium | high
summary: "≤140 char summary, rendered in INDEX.md"
---

# Title

Body in markdown. 1-4 short paragraphs is typical.
```

Validated by `NodeFrontmatterSchema`.

## Proposal frontmatter (`_proposed/{additions,modifications,contradictions}/<slug>.md`)

The same shape as a node, plus a `proposal` block:

```yaml
---
…all node fields…
proposal:
  kind: addition | modification | contradiction
  source_sessions: [session-id, ...]           # which captured sessions produced this
  target_node: practice-foo | null             # for modifications/contradictions
  rationale: "free-text why this exists"       # e.g. "bootstrap: docs/auth.md" or "manual"
  suggested_resolution: supersede | keep_both | reject | null
  curator_log: _logs/curator/<run-id>__<ts>.jsonl | null
---
```

Validated by `ProposalFrontmatterSchema`. Two invariants enforced at write time:

- Contradictions **always** carry `suggested_resolution: null`. The curator never auto-resolves; the reviewer picks during `proposals review`.
- `proposal.kind` must match the proposal's containing directory (`addition` → `additions/`, etc.).

## Session log frontmatter (`_sessions/<YYYYMMDD-HHmm-id>.md`)

```yaml
---
schema_version: 1
session_id: <claude-code-session-id>
captured_by: stop | session_end | pre_compact | manual
captured_at: 2026-05-11T10:00:00Z
transcript_hash: sha256:<hex>                   # dedup key
stage_2_status: pending | done | failed | skipped
stage_2_completed_at: <ISO> | null
stage_2_error: <string> | null
stage_2_log: _logs/stage-2/<id>__<ts>.jsonl | null
gitleaks_status: clean | redacted | blocked | skipped
topics: [string, ...]                           # deduped tags from stage-2 candidates
proposals:
  practice: [<Stage2Candidate>, ...]
  map: [<Stage2Candidate>, ...]
# After curate runs:
curator_processed_at: 2026-05-11T11:00:00Z      # informational; if set, log is excluded from listPendingSessions
curator_run_id: <ULID>
---
```

Validated by `SessionLogFrontmatterSchema` (the curator fields are optional and read by helpers, not the schema).

## Stage-2 candidate

The shape the stage-2 prompt is expected to emit, and what the curator consumes:

```yaml
kind: practice | map
tags: [string, ...]
title: <string>
summary: <≤140 chars>
body: <markdown>
confidence: low | medium | high
supports_existing_node: <node-id> | null
contradicts_existing_node: <node-id> | null
```

Validated by `Stage2CandidateSchema`. The stage-2 worker schema is `Stage2OutputSchema = { practice: [...], map: [...] }`.

## Bootstrap candidate

A superset of the stage-2 candidate — adds `derived_from` (the source-doc paths the chunk provided):

```yaml
kind: practice | map
tags: [string, ...]
title: <string>
summary: <string>
body: <markdown>
confidence: low | medium | high
derived_from: [string, ...]                     # at least one in practice; can be empty for single-doc batches
supports_existing_node: null                    # always null in bootstrap output
contradicts_existing_node: null                 # always null in bootstrap output
```

Validated by `BootstrapCandidateSchema`. The bootstrap-incremental worker output is `BootstrapOutputSchema = { practice: [...], map: [...] }`.

## Curator action

The curator emits a list of actions per batch:

```yaml
action: add | modify | contradict | drop
candidate_origin: "<session_id>:<practice|map>:<index>"
target_node_id: <node-id> | null                # for modify/contradict
proposed_node: <CuratorProposedNode> | null     # null only for drop
rationale: <free-text>
suggested_resolution: supersede | keep_both | reject | null
```

The wrapper code converts each non-drop action into a proposal file with the right frontmatter. `CuratorOutputSchema` is the per-batch top-level shape (an array of actions).

## INDEX.md frontmatter

```yaml
---
schema_version: 1
generated_at: 2026-05-10T14:30:00Z
nodes_hash: sha256:<hex>                        # content hash of nodes/ (see below)
node_count: 47
budget_tokens: 2000
---
```

Validated by `IndexFrontmatterSchema`. The `nodes_hash` field is what `doctor` and the consume hook compare against to detect drift.

## GRAPH.md frontmatter

```yaml
---
schema_version: 1
generated_at: 2026-05-10T14:30:00Z
nodes_hash: sha256:<hex>
node_count: 47
---
```

Validated by `GraphFrontmatterSchema`.

## `nodes_hash` algorithm

Deterministic across filesystems, independent of mtimes:

1. Walk all `.md` files under `nodes/` recursively.
2. For each file, compute `sha256(file_contents)`.
3. Build the list of strings: `<relative-path-from-nodes-dir>\t<sha256-hex>`.
4. Sort lexicographically by the string.
5. Join with `\n`.
6. `nodes_hash = sha256(joined)`.

Implemented in `computeNodesHash` in `src/lib/nodes.ts`. Same content → same hash regardless of when or where the file system was created.

## `state.json`

```yaml
---  # JSON, not YAML — the runtime parses it as JSON
{
  "schema_version": 1,
  "lock": {                                     # null when no lock held
    "name": "stage2-drain" | "curator" | "bootstrap-incremental",
    "pid": 12345,
    "acquired_at": "2026-05-11T10:00:00Z",
    "ttl_ms": 1800000
  } | null,
  "last_nudged_at": "2026-05-11T10:00:00Z" | null
}
---
```

Validated by `StateFileSchema`. Gitignored. Lock TTL defaults to 30 minutes; older locks are reclaimed.

## `bootstrap-state.json`

See [Reference > `bootstrap-state.json` schema](bootstrap-state.md) for the full shape. Validated by `BootstrapStateSchema`.

## Where each schema is used

| Schema | Read at | Written by |
|---|---|---|
| `NodeFrontmatterSchema` | curator (existing-node refs), consume (INDEX gen), doctor (dangling refs) | proposals review (on accept) |
| `ProposalFrontmatterSchema` | proposals review | curator, node-add, bootstrap-incremental |
| `SessionLogFrontmatterSchema` | stage-2 drain, curator, consume | capture (stage-1), stage-2 drain (updates) |
| `Stage2OutputSchema` | stage-2 drain (validating LLM output) | the LLM via `stage-2-extract.md` |
| `BootstrapOutputSchema` | bootstrap-incremental (validating LLM output) | the LLM via `bootstrap-incremental.md` |
| `CuratorOutputSchema` | curator (validating LLM output) | the LLM via `curator.md` |
| `IndexFrontmatterSchema` | consume hook (stale detection), doctor (freshness) | curator, index-rebuild |
| `GraphFrontmatterSchema` | (rarely read) | curator, index-rebuild |
| `StateFileSchema` | stage-2 drain, curator, bootstrap-incremental, consume | all four pipelines |
| `BootstrapStateSchema` | bootstrap-incremental | bootstrap-incremental |
