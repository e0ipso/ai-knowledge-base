---
id: 7
group: "usage-verification"
dependencies: [1, 3, 4, 5, 6]
status: "completed"
created: 2026-06-11
skills:
  - vitest
  - typescript
complexity_score: 5
complexity_notes: "Covers the core custom logic (classification + monotonic/compaction reconciliation) plus per-adapter extractor fixtures in five native formats."
---
# Tests: classification, monotonic reconciliation, per-adapter extractor fixtures

## Objective
Verify the feature's custom logic: knowledge-base read classification, the
monotonic/compaction-safe ledger reconciliation, and each adapter's read
extractor against a fixture in its real native format.

## Skills Required
`vitest`, `typescript`.

## Acceptance Criteria
- [ ] **Classification**: leaf node read → `{document: <node-id>, type:'leaf'}`; branch `index.md` read → `{document:'nodes/…/index.md', type:'index'}`; a read outside `nodes/` → `null`; absolute and relative read paths both classify correctly.
- [ ] **Reconciliation**: N reads of one document in a session → N lines; re-running with the same (cumulative) input adds nothing; adding one more read appends exactly one line; a shorter (post-compaction) input removes/decreases nothing; records validate against `UsageRecord`.
- [ ] **Per-adapter extractors** against a native-format fixture each (Claude `tool_use`/`Read`/`file_path`; Cursor `tool_use`/`ReadFile`/`input.path`; Codex rollout `function_call`; OpenCode `part/` tree; Copilot `events.jsonl` `tool.execution_start`/`view`/`arguments.path`) return the expected node read paths and ignore non-read tool calls. The Copilot fixture uses the real `tool.execution_start` shape, not the invented `toolCall`.
- [ ] **Ledger location**: an assertion (or a note in the test) confirms `usage.jsonl` resolves under `.state/` (gitignored); `git check-ignore` may be used in an integration check.
- [ ] All new tests pass under the project's vitest config.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
vitest (see `vitest.config.ts`, existing tests under `tests/`); the modules from Tasks 1–6; small fixtures placed under `tests/fixtures/` mirroring each harness's real raw shape.

## Input Dependencies
Tasks 1 (classify/reconcile), 3, 4, 5, 6 (per-adapter extractors).

## Output Artifacts
- Vitest specs for classification, reconciliation, and the five adapter extractors, plus fixtures.

## Implementation Notes
<details>
<summary>Test philosophy — "write a few tests, mostly integration"</summary>

Meaningful tests verify custom business logic, critical paths, and edge cases
specific to this application. Test *your* code, not the framework or library.

**When TO write tests:** custom business logic and algorithms; critical workflows
and data transformations; edge cases and error conditions for core functionality;
integration points between components; complex validation/calculations.

**When NOT to write tests:** third-party library functionality; framework
features; simple CRUD without custom logic; trivial getters/setters or static
config; obvious functionality that would break immediately if incorrect.

**Rules:** combine related scenarios into a single task/spec; favor integration
and critical-path coverage over per-method unit tests; avoid one test per CRUD
operation; question whether simple functions need a dedicated test.

Applied here: the *reconciliation* (monotonic delta, idempotent re-capture,
compaction-never-decreases) and *classification* (leaf vs index, path
normalization) are the custom logic worth covering. The adapter extractors are
worth one fixture-driven test each because each parses a different real format.
Do not test the parsing libraries themselves or trivial pass-throughs.
</details>

<details>
<summary>Concrete steps</summary>

1. Unit-test `classifyRead` with: a leaf path (absolute and relative), an `index.md` path, a path outside `nodes/`, and a non-`.md` file under `nodes/` (→ null).
2. Drive `reconcileUsage` against a temp `usage.jsonl`: (a) two reads of doc X + one of doc Y → 2 + 1 lines; (b) re-run with the same input → no change; (c) re-run with three reads of X → +1 line (total 3); (d) re-run with one read of X (simulating post-compaction truncation) → no removal, still 3. Assert every line parses and validates against `UsageRecord`.
3. For each adapter, craft a minimal fixture in its real format containing a read of a leaf node and a branch `index.md` plus one non-read tool call; assert the extractor returns exactly the two read paths. Reuse the measured Copilot v1.0.61 line shape and the Cursor `ReadFile`/`input.path` shape verified during planning.
4. Keep fixtures tiny and colocated under `tests/fixtures/usage/<harness>/`.
</details>
