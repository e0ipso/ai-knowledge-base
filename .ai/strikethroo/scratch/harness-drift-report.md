# Harness Drift Report

## The numbers

| Area | LOC | Notes |
|---|---|---|
| `src/lib/` (shared) | 2,863 | Centralized business logic |
| `src/harnesses/` (adapters) | 4,430 | 4 adapters x ~1,100 avg |
| **Adapter:shared ratio** | **1.55:1** | More code in adapters than in shared lib |

| Harness | LOC | Hook LOC | Non-hook LOC |
|---|---|---|---|
| claude | 947 | 326 | 621 |
| codex | 1,252 | 499 | 753 |
| cursor | 1,059 | 481 | 578 |
| opencode | 1,172 | 503 | 669 |

---

## Category 1: Identical code copy-pasted across harnesses (centralizable now)

These are functions where the implementations are **byte-for-byte identical** across all harnesses. No harness-specific adaptation. Pure duplication.

### `readStdin()` -- 15 copies

The same 12-line function is copy-pasted into **15 hook files** (4 hooks x 4 harnesses, minus claude's stub proposal-drain). Every hook in every harness has its own private copy. This is the worst single offender.

### `pickModelChoice()` -- 4 copies

Identical switch statement in `claude/opts.ts`, `codex/opts.ts`, `cursor/opts.ts`, `opencode/opts.ts`. Maps role to settings field. Zero harness-specific logic.

### `loadProposalPrompt()` -- 3 copies

Identical in `codex/hooks/kb-proposal-drain.ts`, `cursor/hooks/kb-proposal-drain.ts`, `opencode/hooks/kb-proposal-drain.ts`. Loads override or bundled prompt template.

### `copyTree()` -- 3 copies

Identical in `codex/install.ts`, `cursor/install.ts`, `opencode/install.ts` (claude's version is different but functionally equivalent -- it calls `cpSync` slightly differently but same effect).

### Paths functions -- duplicated between `install.ts` and `doctor.ts` within each harness

Each harness defines `*Paths()` in install.ts and `*Locations()` in doctor.ts. These return overlapping but not identical path objects. Within each harness, the two functions could be unified. Across harnesses, the pattern is the same but the directories differ (warranted).

### Total waste estimate

~200-250 lines of pure duplication that could move to `src/lib/` with zero behavioral change.

---

## Category 2: Same business logic, different output envelope (partially centralizable)

These are cases where the **core logic** is identical across harnesses, but each harness wraps the result differently for its runtime's injection mechanism. The core logic is a centralization target; the envelope is not.

### Session-start nudge rendering

This is the exact case from commit `732dce1`. The business logic is:

```
if nudged:
  build status line -> "KB curation overdue: N pending, M candidates"
  build ASCII box -> "KB curation is overdue / Run /kb-curate"
  build code-fence instruction -> "IMPORTANT: append the following..."
else:
  build status line -> "KB queue: N pending, M candidates"
```

This logic is **identical** across codex, cursor, and opencode. Claude has a different approach (just the status line as `systemMessage`, no box/code-fence -- warranted because Claude has a native system message channel).

But the **core string-building** (status line, box, code-fence instruction) is pure logic with no harness dependency. It belongs in `src/lib/session-start.ts` alongside `buildSessionStartContext()`, returning a structured object that each hook's 3-line output glue can format.

### Proposal drain pipeline

`codex/hooks/kb-proposal-drain.ts`, `cursor/hooks/kb-proposal-drain.ts`, `opencode/hooks/kb-proposal-drain.ts` are ~114 lines each with ~85% identical logic:
- CLI availability check (`which <binary>`)
- Parse stdin
- Resolve paths
- Load prompt
- Call `drainProposalQueue()`

Only the CLI binary name and the runner/opts builder differ. This could be a shared `runProposalDrain()` function that takes the harness adapter as a parameter.

### Lint-tick pipeline

`kb-lint-tick.ts` across all 4 harnesses is 91-95 lines each. The only difference is how `cwd` is extracted from stdin (direct `input.cwd` vs `input.workspace_roots[0]`). Everything else -- counter increment, threshold check, lint call, state write -- is identical. ~80 lines per harness could be shared.

### Capture pipeline skeleton

The outer structure of `kb-capture.ts` (recursion guard -> parse stdin -> resolve paths -> call `captureSession()` -> emit output) is the same everywhere. The inner transcript location/parsing differs by harness (warranted). But the boilerplate skeleton (~40 lines) is repeated.

### Total opportunity estimate

~400-500 lines could be extracted as shared "pipeline runners" that harness hooks call with a thin adapter-specific wrapper.

---

## Category 3: Unwarranted drift (bugs from incomplete propagation)

### Cursor `install.ts` drops `async` and `matcher` from hook specs

**Claude** (line 42-43) and **Codex** (line 45-46) spread `async` and `matcher` fields:
```typescript
...(spec.async ? { async: true } : {}),
...(spec.matcher ? { matcher: spec.matcher } : {}),
```

**Cursor** (line 34-37) omits them:
```typescript
cursorHookSpecs.map(spec => ({
  event: spec.event,
  scriptPath: `.cursor/hooks/${spec.scriptPath}`,
}))
```

If any Cursor hook spec ever declares `async: true` or a `matcher`, it silently won't be registered. This is a propagation bug.

### `headless.ts` error messages say "curator" for all roles

Claude, Codex, and Cursor all have (respectively lines 136, 172, 138):
```
"curator output was not valid JSON"
```
and (lines 142, 178, 144):
```
"proposal output did not match schema"
```

These functions are called for curator, proposal, **and** bootstrap roles. The error messages are misleading for non-curator/non-proposal calls. This was copy-pasted from Claude without adapting. OpenCode partially fixed it (says "opencode output" instead of "curator output") but still hardcodes the name differently.

### Cursor `hooks-config.ts` command path format

Codex uses `node ./${hook.scriptPath}` (line 162). Cursor uses `node ${hook.scriptPath}` (line 88) -- missing the `./` prefix. This may or may not cause issues depending on Node's module resolution, but it's inconsistent and was likely a typo during copy-paste.

### Cursor missing `refreshCursorTemplates` export

Claude exports `refreshClaudeTemplates` (install.ts:53). Codex exports `refreshCodexTemplates` (install.ts:56). Cursor and OpenCode export nothing. If `upgrade()` in the adapter relies on a refresh function, Cursor may be silently skipping template refreshes.

### Transcript parse error logging

Claude and OpenCode silently swallow parse errors (`catch {}`). Codex and Cursor log with `console.warn`. Inconsistent -- makes debugging harder for silent harnesses, and noisy for others.

---

## Category 4: Warranted differences (inherent to harness architecture)

These differences exist because each harness runtime has fundamentally different integration mechanisms. **Centralization is not possible or desirable here.**

| Area | What differs | Why |
|---|---|---|
| **Output envelope** | Claude: `{systemMessage, hookSpecificOutput.additionalContext}`. Codex: `{additionalContext}`. Cursor: `{additional_context}`. OpenCode: writes to `.opencode/AGENTS.md` | Each runtime has its own context injection API |
| **Transcript parsing** | Claude: JSONL messages. Codex: event stream with dedup. Cursor: agent transcript format. OpenCode: filesystem walk of session/message/part directories | Each runtime stores transcripts differently |
| **Transcript location** | Claude: `transcript_path` in payload. Codex: rollout file search by date. Cursor: conversation ID lookup. OpenCode: storage dir + export fallback | Each runtime's storage layout differs |
| **Input payload shape** | Claude/Codex/OpenCode: `{cwd}`. Cursor: `{workspace_roots: [...]}` | Cursor supports multi-root workspaces |
| **Event names** | Claude: PascalCase (`Stop`, `SessionEnd`). Codex: PascalCase subset. Cursor: camelCase. OpenCode: dot-separated (`session.idle`) | Each runtime's event system is different |
| **Hook registration** | Claude: `.claude/settings.json`. Codex: `.codex/hooks.json` with TOML guard. Cursor: `.cursor/hooks.json`. OpenCode: plugin module (no per-event config) | Each runtime registers hooks differently |
| **Headless spawning** | Claude: `claude -p --output-format stream-json`. Codex: `codex exec --json`. Cursor: `agent -p --output-format json`. OpenCode: `opencode run --format json` | Each CLI has different flags and output formats |
| **Memory files** | Claude: real implementation via headless discovery. Others: `return []` | Only Claude Code has native auto-memory |
| **Proposal drain** | Claude: stub (drain runs inline during `/kb-curate`). Others: full async implementation | Claude runs proposals inline; others need async drain |

---

## Architectural view

```
+-----------------------------------------------------+
|                   HOOKS (per-harness)                |
|                                                      |
|  +----------+ +----------+ +----------+ +---------+  |
|  |  Claude   | |  Codex   | |  Cursor  | |OpenCode |  |
|  | 326 LOC  | | 499 LOC  | | 481 LOC  | | 503 LOC |  |
|  +----+-----+ +----+-----+ +----+-----+ +----+----+  |
|       |             |            |             |      |
|  +----+-------------+------------+-------------+--+  |
|  |          DUPLICATED LOGIC (~650-750 LOC)       |  |
|  |                                                |  |
|  |  * readStdin() x15 copies                      |  |
|  |  * Status line + nudge box rendering x3        |  |
|  |  * Proposal drain skeleton x3                  |  |
|  |  * Lint-tick counter logic x4                  |  |
|  |  * loadProposalPrompt() x3                     |  |
|  |  * Recursion guard + deadline setup x16        |  |
|  |  * Stdin parse + root resolve x16              |  |
|  +------------------------+-----------------------+  |
|                           | could move down          |
|                           v                          |
|  +----------------------------------------------------+
|  |           src/lib/ (shared) -- 2,863 LOC          |
|  |                                                   |
|  |  session-start.ts  capture.ts  proposal-drain.ts  |
|  |  lint.ts  nodes.ts  paths.ts  settings.ts ...     |
|  +---------------------------------------------------+
|                                                      |
+------------------------------------------------------+
|              NON-HOOK ADAPTER FILES                   |
|                                                      |
|  +----------+ +----------+ +----------+ +---------+  |
|  |  Claude   | |  Codex   | |  Cursor  | |OpenCode |  |
|  | 621 LOC  | | 753 LOC  | | 578 LOC  | | 669 LOC |  |
|  +----+-----+ +----+-----+ +----+-----+ +----+----+  |
|       |             |            |             |      |
|  +----+-------------+------------+-------------+--+  |
|  |         DUPLICATED LOGIC (~200-250 LOC)        |  |
|  |                                                |  |
|  |  * pickModelChoice() x4 copies                 |  |
|  |  * copyTree() x3 copies                        |  |
|  |  * *Paths()/*Locations() x2 per harness        |  |
|  |  * tailString/tail x2-3 copies                 |  |
|  +------------------------------------------------+  |
+------------------------------------------------------+
```

**Estimated centralizable code: ~850-1,000 lines out of 4,430 total adapter lines (~20%).**

---

## Risk model: where the next "fix one, forget three" will happen

The highest-risk areas for future drift (ordered by likelihood x impact):

1. **Session-start nudge rendering** -- any change to the status line, box, or code-fence instruction must be replicated 3-4 times. This already bit you in `732dce1`.
2. **Proposal drain pipeline** -- any change to drain logic, prompt loading, or lock handling must be replicated across codex/cursor/opencode.
3. **Lint-tick threshold logic** -- if you change the counter, state schema, or lint invocation, it must be replicated 4 times.
4. **Error messages in headless.ts** -- already drifted (says "curator" when used for all roles). Future error message improvements will need to touch 4 files.
5. **Install hook mapping** -- already drifted (Cursor drops async/matcher). Any new hook spec field will need to be propagated to all 4 `install.ts` files.
