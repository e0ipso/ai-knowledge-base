---
id: 3
group: "testing"
dependencies: [1, 2]
status: "pending"
created: 2026-05-21
skills:
  - typescript
  - unit-testing
---
# Tests for `hook-diagnostic` and per-hook parse-failure round-trip

## Objective
Lock in the three behaviors the `hook-diagnostic` utility exists to provide, and lock out the failure mode where the diagnostic itself becomes a session-blocker. Add one small piggy-back assertion to an existing hook subprocess test that verifies the integration end-to-end: malformed JSON on stdin produces exit 0 *and* one line in the logs directory.

## Skills Required
- `typescript` — test authoring matches existing conventions under `/workspace/tests/`.
- `unit-testing` — focused tests using per-test tmpdirs; no spawn plumbing for the unit tests themselves.

## Meaningful Test Strategy Guidelines

Your critical mantra for test generation is: "write a few tests, mostly integration".

**Definition of "Meaningful Tests":** Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.

**When TO Write Tests:**
- Custom business logic and algorithms
- Critical user workflows and data transformations
- Edge cases and error conditions for core functionality
- Integration points between different system components
- Complex validation logic or calculations

**When NOT to Write Tests:**
- Third-party library functionality (already tested upstream)
- Framework features (React hooks, Express middleware, etc.)
- Simple CRUD operations without custom logic
- Getter/setter methods or basic property access
- Configuration files or static data
- Obvious functionality that would break immediately if incorrect

**Test Task Creation Rules:**
- Combine related test scenarios into single tasks (e.g., "Test user authentication flow" not separate tasks for login, logout, validation)
- Focus on integration and critical path testing over unit test coverage
- Avoid creating separate tasks for testing each CRUD operation individually
- Question whether simple functions need dedicated test tasks

## Acceptance Criteria
- [ ] File `tests/lib/hook-diagnostic.test.ts` exists with three test cases (described below).
- [ ] **Happy path** test: call `appendHookDiagnostic('test:hook', 'parse', new Error('bad json'), tmpLogsDir)`, read the resulting `hook-errors-YYYY-MM-DD.log` file, assert exactly one line, assert `JSON.parse(line)` yields an object with `ts`, `hook: 'test:hook'`, `phase: 'parse'`, `error: 'bad json'`, and a `ts` value that parses as a valid ISO-8601 Date.
- [ ] **fs-error tolerance** test: point the function at a `logsDir` that cannot be created — recommended: a path whose parent is an existing regular file (create a temp file, then pass `<tempfile>/logs` as the logsDir). Assert that the call does not throw and returns `undefined`. Do not use unwritable-directory tricks that don't work cross-platform / when CI runs as root.
- [ ] **End-to-end wrapper shape** test: define a small in-test helper that mirrors the hook entry-point pattern — a function that throws, an outer catch that calls `appendHookDiagnostic('test:wrapper', 'uncaught', err, tmpLogsDir)`, and a check that "exit 0 would be reached" (i.e. the wrapper itself does not throw). Assert exactly one log line is produced and that its `phase` is `"uncaught"`.
- [ ] Piggy-back assertion added to **one** existing hook subprocess test (recommended: `tests/hooks/kb-capture.test.ts`): when the hook is spawned with deliberately malformed JSON on stdin, the test asserts (a) exit code is `0` and (b) exactly one new line appears in `<kbDir>/_logs/hook-errors-<today>.log` with `phase: "parse"` and the correct harness-prefixed hook identifier. Do not duplicate this across all three harnesses — one is enough; the unit tests already cover the utility itself.
- [ ] All new and existing tests pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Match the project's test framework (likely `vitest` — verify by reading `package.json` and an existing test file like `tests/lib/logs-prune.test.ts`).
- Each test uses `mkdtempSync(join(os.tmpdir(), 'hook-diag-'))` for isolation, with cleanup in `afterEach` / `afterAll`.
- The piggy-back test in `tests/hooks/kb-capture.test.ts` should follow whatever subprocess-spawn helper that file already uses; do not invent new plumbing.
- Date in the assertion: do not hard-code today's date string — compute it the same way the utility does (`new Date().toISOString().slice(0, 10)`) to avoid flake when a test runs across the UTC midnight boundary.

## Input Dependencies
- Task 1: `src/lib/hook-diagnostic.ts` must exist (the unit tests import it).
- Task 2: hook entry points must be rewritten (the piggy-back test asserts the integration shape — without Task 2, malformed JSON would still produce zero log lines).

## Output Artifacts
- `tests/lib/hook-diagnostic.test.ts` with three unit tests.
- One small addition (a single new test case, or a new assertion in an existing case) inside `tests/hooks/kb-capture.test.ts` for the end-to-end parse-failure round trip.

## Implementation Notes

<details>
<summary>Detailed test guidance</summary>

**Verify the test framework first.** Read `package.json` `scripts.test` and one existing test file (e.g. `tests/lib/logs-prune.test.ts`) to confirm vitest vs jest, import style, and tmpdir conventions. Match exactly.

**Happy path — concrete shape:**
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendHookDiagnostic } from '../../src/lib/hook-diagnostic.js';

describe('appendHookDiagnostic', () => {
  let logsDir: string;
  beforeEach(() => { logsDir = mkdtempSync(join(tmpdir(), 'hook-diag-')); });
  afterEach(() => { rmSync(logsDir, { recursive: true, force: true }); });

  it('writes one valid JSON line with expected fields', () => {
    appendHookDiagnostic('test:hook', 'parse', new Error('bad json'), logsDir);
    const files = readdirSync(logsDir);
    const logFile = files.find(f => /^hook-errors-\d{4}-\d{2}-\d{2}\.log$/.test(f));
    expect(logFile).toBeDefined();
    const content = readFileSync(join(logsDir, logFile!), 'utf8');
    const lines = content.split('\n').filter(l => l.length > 0);
    expect(lines).toHaveLength(1);
    const obj = JSON.parse(lines[0]);
    expect(obj).toMatchObject({ hook: 'test:hook', phase: 'parse', error: 'bad json' });
    expect(new Date(obj.ts).toString()).not.toBe('Invalid Date');
  });
  // ... other two tests
});
```

**fs-error tolerance — concrete shape:**
```ts
it('does not throw when logsDir cannot be created', () => {
  const tempFile = join(logsDir, 'not-a-dir');
  writeFileSync(tempFile, 'x'); // regular file
  expect(() =>
    appendHookDiagnostic('test:hook', 'parse', new Error('x'), join(tempFile, 'sub'))
  ).not.toThrow();
});
```
This works cross-platform because `mkdirSync` will fail when an ancestor segment is a regular file.

**End-to-end wrapper shape — concrete shape:**
```ts
it('wrapper pattern records uncaught throws and does not rethrow', () => {
  const fakeMain = async () => { throw new Error('synthetic'); };
  // Simulate the entry-point pattern (without actually exiting)
  let exitedCleanly = false;
  await fakeMain().catch((err: unknown) => {
    appendHookDiagnostic('test:wrapper', 'uncaught', err, logsDir);
    exitedCleanly = true; // stands in for process.exit(0)
  });
  expect(exitedCleanly).toBe(true);
  const files = readdirSync(logsDir);
  const content = readFileSync(join(logsDir, files[0]), 'utf8');
  const obj = JSON.parse(content.trim());
  expect(obj.phase).toBe('uncaught');
  expect(obj.error).toBe('synthetic');
});
```

**Piggy-back test in `tests/hooks/kb-capture.test.ts`:**

Read the existing file first; understand how it spawns the hook subprocess and how it resolves the kb root for assertions. The new test case should:
1. Set up a tmp kb root as the existing tests do.
2. Spawn the claude `kb-capture` hook with stdin payload `"not json"` (or similar invalid JSON).
3. Assert exit code is 0.
4. Read `<kbRoot>/_logs/hook-errors-<today>.log`.
5. Assert exactly one new line, parses as JSON, has `phase: "parse"` and `hook: "claude:kb-capture"`.

If the existing file's structure makes a brand-new `it()` block awkward, add the assertions to an existing block that already exercises an invalid-payload path.

**Do NOT:**
- Spin up subprocesses in `tests/lib/hook-diagnostic.test.ts` — the per-hook subprocess coverage is the piggy-back test's job.
- Test framework behavior (`mkdirSync recursive` semantics, `appendFileSync` atomicity) — those are upstream.
- Add tests for all 12 hooks — one piggy-back end-to-end is sufficient; the diagnostic utility is the same code path regardless of caller.

</details>
