---
id: 2
group: "hook-rewrite"
dependencies: [1]
status: "completed"
created: 2026-05-21
skills:
  - typescript
---
# Rewrite all 12 hook entry points to call `hook-diagnostic`

## Objective
Apply the same two structural edits uniformly to every hook entry point under `src/harnesses/{claude,codex,opencode}/hooks/{kb-capture,kb-lint-tick,kb-proposal-drain,kb-session-start}.ts` so that every swallowed path (uncaught throws and JSON parse failures) produces exactly one diagnostic log line, without changing the success path or the exit contract. The empty-stdin path stays silent.

## Skills Required
- `typescript` — mechanical, mirrored edits across 12 small files. Shape uniformity matters more than cleverness.

## Acceptance Criteria
- [ ] All 12 files updated: `src/harnesses/claude/hooks/*.ts`, `src/harnesses/codex/hooks/*.ts`, `src/harnesses/opencode/hooks/*.ts` (4 files per harness).
- [ ] `grep -rn "void main().catch(() => process.exit(0))" src/harnesses/` returns **zero** matches after the change.
- [ ] Every `try { JSON.parse(raw) } catch { return; }` (or equivalent) block has a `appendHookDiagnostic(..., 'parse', err, paths.logsDir)` call inserted before the `return`. The bare-`catch` form must capture the error (e.g. `catch (err) { ... }`).
- [ ] The trailing `void main().catch(...)` is replaced with a wrapper that calls `appendHookDiagnostic(..., 'uncaught', err, paths.logsDir)` before `process.exit(0)`. The wrapper resolves `paths.logsDir` inside its own inner `try { ... } catch { /* skip */ }` so a `findRepoRoot` failure does not block exit 0.
- [ ] Empty-stdin returns (`if (raw.trim().length === 0) return;`) are left untouched — those are normal idle-fire behavior, not errors.
- [ ] The `KB_BUILDER_INTERNAL=1` early return remains the first statement of `main()` in every file. If any of the 12 files lack this guard, add it (cheap, local edit) — the plan calls this out under "Implementation Risks".
- [ ] The `hook` identifier passed to the diagnostic uses the strict `harness:hookname` shape, hard-coded per file:
  - claude: `"claude:kb-capture"`, `"claude:kb-lint-tick"`, `"claude:kb-proposal-drain"`, `"claude:kb-session-start"`
  - codex: `"codex:kb-capture"`, `"codex:kb-lint-tick"`, `"codex:kb-proposal-drain"`, `"codex:kb-session-start"`
  - opencode: `"opencode:kb-capture"`, `"opencode:kb-lint-tick"`, `"opencode:kb-proposal-drain"`, `"opencode:kb-session-start"`
- [ ] Cross-adapter diff check: diffing equivalent files across the three harnesses shows the catch-wrapper and parse-catch edits are structurally identical, with the only intentional difference being the harness identifier in the `hook` string.
- [ ] All existing tests still pass (run the project test suite — see `package.json` scripts).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Import `appendHookDiagnostic` (or whatever Task 1 exports) from `../../../lib/hook-diagnostic.js` in each hook file.
- Import `findRepoRoot` and `repoPaths` (already imported in most hook files) — the catch wrapper needs them to resolve `paths.logsDir` when `main()` failed before it could.
- The catch wrapper performs path resolution inside its own try/catch:
  ```ts
  void main().catch((err: unknown) => {
    try {
      const paths = repoPaths(findRepoRoot(process.cwd()));
      appendHookDiagnostic('<harness>:<hookname>', 'uncaught', err, paths.logsDir);
    } catch {
      // Outside any project / cannot resolve paths — nothing to log to.
    }
    process.exit(0);
  });
  ```
- Inside `main()`, the parse-catch block changes from:
  ```ts
  try { payload = JSON.parse(raw) as Record<string, unknown>; }
  catch { return; }
  ```
  to:
  ```ts
  try { payload = JSON.parse(raw) as Record<string, unknown>; }
  catch (err) {
    const paths = repoPaths(findRepoRoot(process.cwd()));
    appendHookDiagnostic('<harness>:<hookname>', 'parse', err, paths.logsDir);
    return;
  }
  ```
  If a hook's parse block sits before any path resolution in `main()`, it is fine to call `repoPaths(findRepoRoot(process.cwd()))` here even though `main()` later resolves them again — the cost is negligible and keeps the edit pattern uniform across files.

## Input Dependencies
- Task 1 must be complete: `src/lib/hook-diagnostic.ts` must export the diagnostic function.

## Output Artifacts
- 12 modified hook entry-point files with uniform diagnostic call sites.

## Implementation Notes

<details>
<summary>Detailed mechanical edit guide</summary>

**Read first.** Open all four `src/harnesses/claude/hooks/*.ts` files and read them end-to-end before editing. The shape is mirrored across the three harnesses (per the project's "Don't translate event names across harness adapters" practice), but each of the four *hook types* has its own structure. Understand the per-hook differences, then apply the two edits uniformly.

**File-by-file checklist:**

For each of the 12 files:

1. Verify `import { findRepoRoot, repoPaths } from '../../../lib/paths.js';` is present. Add if missing.
2. Add `import { appendHookDiagnostic } from '../../../lib/hook-diagnostic.js';` (verify exact export name from Task 1).
3. Confirm `if (process.env['KB_BUILDER_INTERNAL'] === '1') return;` is the first executable statement in `main()`. Add if missing.
4. Find every `try { JSON.parse(...) } catch { ... }`. Convert the bare `catch` to `catch (err)`, insert the diagnostic call before the `return`.
5. Replace the trailing `void main().catch(() => process.exit(0));` with the wrapper shown above, substituting the correct hard-coded `harness:hookname` identifier.

**On the diagnostic-call ordering inside the parse catch.** It must come *before* the `return`. Path resolution may throw if invoked outside a repo, which is why the outer catch wrapper wraps its path resolution. For the inner parse catch, the hook is already executing inside `main()` which means stdin was received and the harness invoked it from a project context — `findRepoRoot(process.cwd())` should succeed. If you want belt-and-suspenders, you may also wrap the inner diagnostic call in `try { ... } catch { /* skip */ }`, but the diagnostic utility itself already swallows everything, so a throw can only originate from `findRepoRoot` / `repoPaths`. Use judgment; consistency across the 12 files matters more than which option you pick.

**Hooks that already compute `paths` early in `main()`.** Some hooks resolve `paths` before the parse step (look at `kb-session-start.ts`); for those, the inner parse-catch can reuse the already-computed `paths.logsDir` rather than re-resolving. This is fine — uniformity of the *call* matters, not the source of the `logsDir` argument.

**The 12 identifiers — final list:**
```
claude:kb-capture
claude:kb-lint-tick
claude:kb-proposal-drain
claude:kb-session-start
codex:kb-capture
codex:kb-lint-tick
codex:kb-proposal-drain
codex:kb-session-start
opencode:kb-capture
opencode:kb-lint-tick
opencode:kb-proposal-drain
opencode:kb-session-start
```

**Do NOT:**
- Change the empty-stdin early return.
- Change the `HARD_DEADLINE_MS` setTimeout.
- Change any business logic inside `main()` beyond the parse-catch.
- Add logging on success paths.
- Change exit codes (still always 0).
- Add new fields to the diagnostic call beyond what Task 1's signature accepts.

**Sanity check before declaring done:**
```bash
# Must return zero matches:
grep -rn "void main().catch(() => process.exit(0))" src/harnesses/
# Must NOT find any bare `catch { return; }` after a JSON.parse — inspect any remaining:
grep -rn "} catch { return; }" src/harnesses/
grep -rn "} catch {$" src/harnesses/
# Diff a trio of equivalent files (e.g. kb-capture.ts across three harnesses)
# and confirm the catch-wrapper + parse-catch shape is identical except identifier.
diff <(sed 's/claude:/HARNESS:/' src/harnesses/claude/hooks/kb-capture.ts) \
     <(sed 's/codex:/HARNESS:/' src/harnesses/codex/hooks/kb-capture.ts)
```

</details>
