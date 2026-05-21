---
id: 1
group: "diagnostic-utility"
dependencies: []
status: "completed"
created: 2026-05-21
skills:
  - typescript
---
# Create `src/lib/hook-diagnostic.ts` shared utility

## Objective
Create a single, dependency-light, fault-tolerant sink that turns a swallowed hook error into one NDJSON line on disk — and produces no observable effect (no throw, no exit-code change) if that write itself fails. This is the one new module plan 28 introduces; the 12 hook entry points consume it in a follow-up task.

## Skills Required
- `typescript` — single Node module using only `fs`/`path` from the standard library.

## Acceptance Criteria
- [ ] File `src/lib/hook-diagnostic.ts` exists and exports one function.
- [ ] Function signature accepts: hook identifier (string, e.g. `"claude:kb-capture"`), phase tag (free-form string; callers will use `"uncaught"` and `"parse"`), an error value (`unknown`), and the resolved logs directory (string absolute path).
- [ ] Function computes today's date in **UTC** as `YYYY-MM-DD` and builds the target path `<logsDir>/hook-errors-YYYY-MM-DD.log`.
- [ ] Function ensures the parent directory exists via `fs.mkdirSync(logsDir, { recursive: true })`.
- [ ] Function appends one NDJSON line of the shape `{ "ts": <ISO-8601 UTC>, "hook": <string>, "phase": <string>, "error": <string> }` followed by `\n`.
- [ ] Entire function body is wrapped in a single broad `try { ... } catch { /* swallow */ }` so the function returns `void` and never throws under any input (including invalid `logsDir`, unwritable filesystem, or an `error` argument whose `.message` accessor itself throws).
- [ ] Implementation uses `fs.appendFileSync` (synchronous) — the whole module is sync so callers can invoke it from inside their own catch blocks without `await`.
- [ ] The `error` field is derived as: `err instanceof Error ? err.message : String(err)` — coerced inside the try/catch so a throwing `String(err)` also cannot escape.
- [ ] No new runtime dependencies added to `package.json`.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- TypeScript file under `src/lib/`. Match the existing module style in `src/lib/paths.ts` and `src/lib/logs-prune.ts` (ESM `.js` import extensions in TypeScript source per project convention — verify by reading `src/lib/paths.ts`).
- Use Node's standard library only: `node:fs` (`appendFileSync`, `mkdirSync`), `node:path` (`join`).
- Export shape: a single named function. Suggested signature:
  ```ts
  export function appendHookDiagnostic(
    hook: string,
    phase: string,
    error: unknown,
    logsDir: string
  ): void;
  ```
- UTC date: `new Date().toISOString().slice(0, 10)` for the filename; `new Date().toISOString()` for the `ts` field.

## Input Dependencies
None — this is a leaf module.

## Output Artifacts
- `src/lib/hook-diagnostic.ts` exporting `appendHookDiagnostic` (or equivalent name).

Consumed by Task 2 (hook entry-point rewrite) and Task 3 (unit tests).

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

**Why a sync API.** The 12 hook entry points each end with `void main().catch(() => process.exit(0))`. Making the diagnostic synchronous means the catch wrapper stays trivial — no `.then(() => process.exit(0))` chains, no unhandled promise rejection risk in the swallow path. The hook deadline budget is 1 second wall-clock, and a single `appendFileSync` is well within that.

**Why UTC.** File rollover must be timezone-independent so CI artifacts and cross-machine triage line up. Both the filename date and the `ts` field use UTC. Do not use `toLocaleDateString` or any timezone-sensitive API.

**Why the body must not throw.** This module exists to handle the failure mode where exit 0 is non-negotiable. If the diagnostic itself can throw, it becomes the failure it was trying to record. The single broad try/catch is the load-bearing invariant the unit tests pin in place. Code reviewer (Task 2 author, or a reviewer) should specifically look for any code path that could escape that catch — e.g. synchronous throws during argument coercion *before* the try opens.

**Concrete shape** (illustrative — adapt to project conventions):

```ts
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function appendHookDiagnostic(
  hook: string,
  phase: string,
  error: unknown,
  logsDir: string
): void {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const ts = now.toISOString();
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const line =
      JSON.stringify({ ts, hook, phase, error: errorMessage }) + '\n';
    mkdirSync(logsDir, { recursive: true });
    appendFileSync(join(logsDir, `hook-errors-${dateStr}.log`), line, 'utf8');
  } catch {
    // Best-effort. A failed diagnostic write must never surface.
  }
}
```

**Do NOT add:**
- Any retry logic.
- Any rotation logic (filename date is the rotation mechanism; pruning lives in the existing `logs-prune.ts`).
- Any console output on failure (would defeat the silent-swallow purpose).
- Any extra fields in the JSON object (the plan pins the shape to four fields — see "Scope Risks" in the plan; widening it invites secret-leak surface area).
- Any logsDir validation (let `mkdirSync` decide; failures are swallowed).

**Module style check.** Before writing, open `src/lib/paths.ts` and `src/lib/logs-prune.ts` and match: import style (`.js` extensions in TS source if used), export style (named vs default), JSDoc presence and shape. The new module should look like it belongs next to them.

</details>
