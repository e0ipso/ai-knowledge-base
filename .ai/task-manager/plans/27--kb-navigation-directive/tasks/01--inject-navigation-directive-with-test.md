---
id: 1
group: "session-start-payload"
dependencies: []
status: "completed"
created: 2026-05-21
skills:
  - typescript
  - vitest
---
# Inject KB Navigation Directive into SessionStart Payload and Pin It with a Test

## Objective

Add a ≤2-line, unconditional KB-navigation directive to the additional-context payload built in `src/lib/session-start.ts`, immediately after the existing "snapshots in time" caveat, and add a unit test in `tests/lib/session-start.test.ts` that pins the directive into the payload via a stable anchor phrase so future refactors cannot silently drop it.

## Skills Required

- `typescript` — editing `src/lib/session-start.ts` while preserving the existing `lines.push(...)` composition order and idioms.
- `vitest` — adding a focused test case alongside the existing `buildSessionStartContext` coverage in `tests/lib/session-start.test.ts`.

## Acceptance Criteria

- [ ] `src/lib/session-start.ts` emits a navigation directive in the `additionalContext` payload immediately after the "snapshots in time" caveat and before any conditional blocks (staleness warning, curation nudge, lint summary).
- [ ] The directive is at most 2 lines in the rendered payload, communicates three things — (1) consult the INDEX first, (2) `grep -C 2 <term> nodes/` for candidate slugs, (3) open full node bodies only for confirmed matches — and uses the same `>` blockquote style as the adjacent caveat.
- [ ] The directive ships unconditionally — no config knob, no threshold, no per-harness branch.
- [ ] `tests/lib/session-start.test.ts` includes a new test case asserting that, under a vanilla harness configuration produced by the existing `makeHarness()` helper, `result.additionalContext` contains the anchor substrings `grep -C 2` and `nodes/`.
- [ ] The new test asserts on the anchor phrase only — it does not pin the full directive wording.
- [ ] All previously-passing tests in `tests/lib/session-start.test.ts` still pass (no incidental changes to the other assertions).
- [ ] `npx vitest run tests/lib/session-start.test.ts` is green; `npm test` is green.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Edit `src/lib/session-start.ts` in the `lines: string[]` composition block (currently around lines 81–110). Insert the directive after the snapshots caveat `lines.push('> KB nodes are snapshots in time. …')` and before the `if (indexStale)` conditional. Match the existing pattern: a `lines.push('')` separator followed by one or two `lines.push('> …')` calls.
- Wording must explicitly name `grep -C 2` (the flag is load-bearing; without it the agent picks a different context value and the `summary:` frontmatter line is not surfaced). Phrase the verb generically ("grep", not "ripgrep") so consumer environments are free to substitute equivalent tools.
- Edit `tests/lib/session-start.test.ts` by adding a single new `it(...)` block inside the existing `describe('buildSessionStartContext', ...)` suite. Reuse the existing `makeHarness()` helper and the existing path-construction pattern for the KB. The test must assert both `expect(result.additionalContext).toContain('grep -C 2')` and `expect(result.additionalContext).toContain('nodes/')`.
- Do not introduce new helpers, fixtures, or test files.
- Do not touch any other file — no `src/harnesses/*`, no templates pipeline, no consumer-facing docs.

## Input Dependencies

None. This task depends only on the existing payload composition pattern in `src/lib/session-start.ts` and the existing test scaffolding in `tests/lib/session-start.test.ts`.

## Output Artifacts

- Modified `src/lib/session-start.ts` with the directive emitted in the payload.
- Modified `tests/lib/session-start.test.ts` with one new passing test case.
- A stable anchor phrase (`grep -C 2` + `nodes/`) that downstream documentation (Task 2) can reference.

## Implementation Notes

<details>
<summary>Step-by-step implementation</summary>

1. Open `src/lib/session-start.ts` and locate the `lines: string[]` block (around line 81). Identify the snapshots-caveat push (the `lines.push('> KB nodes are snapshots in time. …')` call, currently lines 84–86).

2. Immediately after that push (and before the `if (indexStale)` branch on line 87), insert a blank-line separator and the directive. Use the same blockquote style. For example:

   ```ts
   lines.push('');
   lines.push(
     '> KB navigation: consult the index above first, then `grep -C 2 <term> nodes/` for candidate slugs (the `-C 2` context surfaces the `summary:` frontmatter line), and only open full node bodies for confirmed matches.'
   );
   ```

   You may split the directive into two `lines.push('> …')` calls if a two-line layout reads better. Keep the total to ≤2 rendered lines. Do not exceed two lines.

3. Verify the directive sits strictly between the snapshots caveat and the `if (indexStale)` conditional — this ordering is required by the plan ("standing guidance" before "conditional content").

4. Open `tests/lib/session-start.test.ts`. Locate the `describe('buildSessionStartContext', …)` block. Inside it, add a new test case:

   ```ts
   it('emits the KB navigation directive in the additional context payload', async () => {
     const harness = await makeHarness();
     const result = await buildSessionStartContext(harness);
     expect(result.additionalContext).toContain('grep -C 2');
     expect(result.additionalContext).toContain('nodes/');
   });
   ```

   Use whichever `makeHarness()` / setup signature the surrounding tests already use — do not invent a new harness shape. If `makeHarness` returns a harness that does not by itself produce a populated INDEX body, replicate the same minimal-KB scaffolding the closest existing test case uses (look at how the staleness or nudge tests construct their KB state).

5. Run `npx vitest run tests/lib/session-start.test.ts` and confirm the new case passes alongside every existing case. If any pre-existing assertion fails, your directive insertion changed the payload in a way other tests pin (e.g., line counts, exact ordering of conditional blocks) — fix the insertion, not the existing tests.

6. Run `npm test` and confirm the full unit suite still passes.

7. Sanity-check the directive by reading it aloud: a first-time reader should understand the three layers (INDEX → grep `nodes/` → full read) and know the `-C 2` flag is operational, not decorative. If unclear, refine the wording — the anchor-only test allows this without test churn.

</details>

<details>
<summary>Constraints and things to avoid</summary>

- **Do not** add a config option, environment variable, or threshold that gates the directive. The directive is unconditional. The plan explicitly rejects this as YAGNI.
- **Do not** pin the full directive wording in the test. Assert only on `grep -C 2` and `nodes/`. The plan calls this out as a stated risk mitigation.
- **Do not** modify `src/harnesses/*`, `src/templates-source/`, `templates/`, `docs/daily-use.md`, `docs/how-it-works.md`, or the root `README.md`. The plan's Success Criteria #5 verifies these are untouched with `git diff main -- …`.
- **Do not** update `templates-source/knowledge-base/README.md`. The plan and the original issue both exclude it: agents do not auto-read consumer READMEs, so guidance there is wishful.
- **Do not** introduce new dependencies, helpers, or fixtures.
- **Do not** reorder the existing `lines.push` sequence beyond inserting the directive at the documented position. The staleness warning, curation nudge, and lint summary remain as conditional blocks after the directive.

</details>
