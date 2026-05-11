# Fixture: Session Transcript — Routine work, zero captures expected

This is a synthetic Claude Code session containing only routine work. The stage-2 extraction prompt should produce `{"practice": [], "map": []}` against this transcript. If it produces anything, the prompt is over-capturing.

The session deliberately contains:

- A bug fix for a generic syntax error.
- A refactor that doesn't change architecture.
- File exploration to understand existing code.
- A method implementation that worked first try.
- Generic programming questions answered from general knowledge.
- Agent paraphrasing of the user's task descriptions.
- An aspirational comment ("we should eventually...") that's a TODO, not a convention.

No teaching moments. No corrections that reveal project conventions. No introduction of new named features or vocabulary.

---

[USER]: There's a bug in src/utils/parseDate.ts. The function throws on empty strings instead of returning null. Can you fix it?

[AGENT]: Let me read the file first.

[AGENT]: <reads src/utils/parseDate.ts>

[AGENT]: I see — the function calls `new Date(input)` which throws on empty input. I'll add a guard clause that returns `null` for empty strings before constructing the Date.

[AGENT]: <edits parseDate.ts to add `if (!input) return null;` at the top>

[USER]: Run the tests.

[AGENT]: <runs `npm test -- parseDate`>

[AGENT]: All 14 tests pass, including the two new ones I added covering empty string and whitespace-only input.

[USER]: Good. Now in src/utils/formatCurrency.ts, the function signature is `formatCurrency(amount, locale, currency)`. I want to refactor it to take an options object: `formatCurrency(amount, { locale, currency })`. Update all call sites.

[AGENT]: I'll find all call sites first.

[AGENT]: <runs `grep -rn "formatCurrency(" src/`>

[AGENT]: Found 8 call sites across 6 files. Let me update the function signature and each call site.

[AGENT]: <edits formatCurrency.ts to use options object>

[AGENT]: <edits 6 call-site files>

[USER]: Tests?

[AGENT]: <runs `npm test`>

[AGENT]: All tests pass.

[USER]: Add a helper that returns the first letter of a string capitalized. Put it in src/utils/string.ts.

[AGENT]: I'll add a `capitalizeFirst(str: string): string` function. Returns empty string if input is empty.

[AGENT]: <writes function: `export function capitalizeFirst(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : ''; }`>

[USER]: Looks good.

[USER]: How does Array.prototype.reduce work again? I always forget the parameter order.

[AGENT]: `reduce` takes a reducer function `(accumulator, currentValue, currentIndex, array) => newAccumulator` and an optional initial value. If no initial value is provided, the first array element is used as the initial accumulator and iteration starts from index 1. With an initial value, iteration starts from index 0.

[USER]: Right, thanks. Now grep the codebase for any TODO comments older than six months that we should probably address.

[AGENT]: <runs `git log --diff-filter=A -p -S "TODO" --until="6 months ago"`>

[AGENT]: I found 23 TODOs added more than six months ago. Want me to list them with their file/line locations?

[USER]: Yes.

[AGENT]: <lists 23 TODOs>

[USER]: Most of those are fine to leave. Note this one for me though: `src/services/email.ts:142 // TODO: we should eventually move to a queue-based email sender instead of synchronous SMTP`. Leave it for now, just keep it in mind.

[AGENT]: Noted. Not making any changes.

[USER]: Add a JSDoc comment to capitalizeFirst.

[AGENT]: <adds JSDoc>

[USER]: Commit everything.

[AGENT]: <runs `git add -A && git commit -m "Fix parseDate empty input; refactor formatCurrency; add capitalizeFirst utility"`>

[USER]: Done for today.
