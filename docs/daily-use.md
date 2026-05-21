---
title: Daily use
nav_order: 4
---

# Daily use

After install, the only thing you do by hand is **curate**, **review**, and **commit**. Everything else is automatic.

## The loop

1. Code with Claude Code as usual.
2. When you see the curate nudge (or whenever you feel like it), run `/kb-curate`.
3. If the curator reports any contradictions, the skill walks you through each one in-session and applies your chosen resolution.
4. Inspect the resulting changes under `.ai/knowledge-base/nodes/` with `git diff` (or your preferred diff tool, e.g. [self-review](https://github.com/e0ipso/self-review)).
5. `git commit` what you want to keep; `git restore <path>` to discard.

The pre-commit hook regenerates `INDEX.md` and `GRAPH.md` and stages them into the same commit, so the injected index never drifts from the committed nodes.

## The SessionStart nudge

When a new session starts, the SessionStart hook counts pending session logs (proposal extracted, not yet curated) and surfaces a nudge once the queue is worth your attention. It has two forms:

- **Soft nudge.** Fires when `pending >= 5` (the default threshold). Shows the pending count, the total candidate proposals waiting (practice + map), the age of the oldest pending log, and the copy/paste command to start curating.
- **Loud nudge.** Fires when `(pending >= 5 && oldestAgeDays >= 7) || pending >= 10` — i.e., the queue is both large and stale, or simply very large. Same body as the soft form, but introduced by a visible heading line:

  > 🔔 KB curation queue is overdue

Both forms share the same one-hour throttle: even if the trigger condition is met, the nudge only re-fires once per hour. Defaults are `threshold = 5` and `staleDays = 7`; both are knobs in `SessionStartContext` if you need to tune them.

## Curate

In a Claude Code session:

```
/kb-curate
```

Or from a shell:

```sh
npx @e0ipso/ai-knowledge-base curate
```

The curator reads every captured session that's been processed but not yet curated and applies its decisions directly to `nodes/`:

- **add** → writes `nodes/<kind>/<id>.md`. Fails loud if the file already exists.
- **modify** → overwrites the target node. Fails loud if `target_node_id` is missing on disk.
- **contradict** → records the conflict as a markdown file under `.ai/knowledge-base/conflicts/<id>.md` with `status: pending` and writes nothing to `nodes/`.
- **drop** → no change.

### Fast path: zero conflicts

After the curator returns, the skill checks two things: `result.conflicts` and `result.failures`. If `result.conflicts === 0 && result.failures.length === 0`, the skill prints exactly one summary line and exits — no walkthrough, no further prompts:

```
Curated <nodes_written> nodes; <drops> dropped; no conflicts. Review with: git diff .ai/knowledge-base/
```

This is the common case once a project stabilizes; the goal is for clean curate runs to finish in seconds.

### Conflict walkthrough: `y` / `n` / `s` / `k`

When there are pending conflicts, the skill groups them (by `target_node_id`, then `proposed_kind`), shows you the existing node once per group, walks each proposed contradiction, and asks for a single-character reply with a highlighted default:

```
Accept this proposal? [Y/n/s/k] (default: Y)
```

The defaults are heuristics — small high-confidence diffs default to `y`, fundamental rewrites default to `n`, everything else defaults to `s`. You always see both sides before being asked.

The four replies are:

- **`y` (Yes / Accept)** — rewrite `nodes/<proposed_kind>/<target_node_id>.md` with the proposed body, then `git restore` the conflict file. Review the node change with `git diff` and commit.
- **`n` (No / Reject)** — `git restore` the conflict file. The existing node is unchanged.
- **`s` (Skip / Defer)** — leave the conflict file alone. It re-surfaces on the next curate pass with `status: pending` intact.
- **`k` (Keep as record)** — `git commit` the conflict file so the disagreement is preserved in history for later review. The existing node is unchanged. Use sparingly.

Empty reply takes the highlighted default. Long forms (`yes`, `no`, `skip`, `keep`) and uppercase variants are accepted. Any other reply (free-form prose like "looks good" or "skip this one") is rejected and the same conflict is re-prompted — the contract is strict on purpose.

> **Breaking change.** The previous Accept / Reject / Keep three-way free-form prompt has been replaced. There is no longer a Replace-vs-Reject choice for each contradiction; the prompt is the single-character `y`/`n`/`s`/`k` contract above. Muscle memory from older releases will need updating.

## Review changes

The KB lives in `nodes/`. Review with `git diff nodes/`, your editor, or a tool like [self-review](https://github.com/e0ipso/self-review). They are important; they may affect how the agent behaves in every future session.

To accept: `git add` and `git commit`. The lint-staged pre-commit hook regenerates and stages `INDEX.md`/`GRAPH.md` so the injected index stays in lockstep.

To reject: `git restore nodes/<kind>/<file>.md` (or delete the file if it's a new addition).

For curator-detected contradictions, let the `/kb-curate` skill walk you through them with the `y`/`n`/`s`/`k` prompt; that's the authoritative resolution path.

## Add knowledge manually

Sometimes you know exactly what you want recorded without going through a session. Two equivalent paths:

```sh
npx @e0ipso/ai-knowledge-base node add        # from a shell
```

```
/kb-add                            # from inside a session
```

Both write directly to `nodes/<kind>/<id>.md`. Review with `git diff` and commit.

## Seed from existing docs (one-time bootstrap)

If your repo already has READMEs, ADRs, and module docs, you can seed the KB from them.

From inside a Claude Code session:

```
/kb-bootstrap                      # scans docs/ and root *.md
/kb-bootstrap docs/architecture    # scope to a path
```

The skill surveys your docs, splits them into practice and map nodes, and writes them directly under `nodes/`. Existing nodes are never overwritten; collisions are skipped and reported. Review with `git diff nodes/` and commit the ones you want.

For re-runs after editing docs:

```sh
npx @e0ipso/ai-knowledge-base bootstrap-incremental --from docs/
```

Hash-aware: only reprocesses docs that changed since the last run. Same conservative collision behavior.

## What about CI?

CI's job is to validate that what's committed is well-formed, not to run the LLM pipelines. A reasonable check:

```sh
npx @e0ipso/ai-knowledge-base doctor --verbose
npx @e0ipso/ai-knowledge-base index rebuild
git diff --exit-code .ai/knowledge-base/INDEX.md .ai/knowledge-base/GRAPH.md
```

The last step catches commits that bypassed the pre-commit hook. Don't run `curate` or `bootstrap-incremental` in CI: they spawn `claude -p` and produce changes to `nodes/` that still need human review.

## Status

To see what's pending at any time:

```sh
npx @e0ipso/ai-knowledge-base status
```

Reports queued captures, pending session logs, unresolved curator conflicts, and node counts.
