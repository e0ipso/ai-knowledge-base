---
id: 35
summary: "Make the KB curation nudge visible to Cursor users by adding a relay instruction to additional_context"
created: 2026-05-26
---

# Plan: Cursor KB Nudge Relay Instruction

## Original Work Order

> Fix: KB Session Start Nudge Not Visible in Cursor
>
> The curation nudge (e.g., "🚨 KB curation overdue") displays in Claude Code
> via `systemMessage` but is invisible in Cursor. Cursor's `sessionStart` hooks
> emit stderr for status messages, but Cursor's UI does not surface stderr to
> the user.

## Plan Clarifications

| Question | Answer |
|----------|--------|
| Does Cursor read `additional_context` from hook stdout? | Yes — confirmed empirically. Cursor injects it as `hooks_context` into the model's context window. |
| Should the nudge go to `.cursor/rules/` via an .mdc file? | No — since `additional_context` already works, adding a relay instruction there is sufficient and simpler. |
| Should the nudge be model-facing or user-facing? | User-facing. Since Cursor has no `systemMessage` equivalent, the workaround is: add an instruction to `additional_context` so the model relays the nudge to the user. |
| Native OS notifications? | Deferred — tracked as GitHub issue [#40](https://github.com/e0ipso/ai-knowledge-base/issues/40). |
| Can the nudge appear before the user types? | No. Cursor has no mechanism for hooks to display UI notifications. The model only responds after user input, so the nudge will appear in the model's first response. Pre-input notification requires native OS notifications (issue #40). |
| Backwards compatibility required? | No. |

## Executive Summary

In Claude Code, the session-start hook emits a `systemMessage` field that
Claude Code displays to the user as a terminal notification. Cursor has no
equivalent channel — stderr is discarded, and the only hook output Cursor reads
is the `additional_context` field on stdout.

The nudge text is already embedded in `additional_context` (via
`buildSessionStartContext()`), but it's passive context that models don't
reliably surface to the user. The fix is to append an explicit relay instruction
in the Cursor hook when the nudge fires, telling the model to proactively inform
the user.

This is a minimal, single-file change to the Cursor session-start hook.

## Context

### Current State vs Target State

| Current State | Target State | Why? |
|---|---|---|
| Cursor users never see the curation nudge — stderr is discarded and `additional_context` contains the nudge text but no instruction to relay it | Cursor users see the curation nudge in the model's **first response** (not before input — Cursor has no pre-input notification channel) | The nudge is a key workflow signal; without it, Cursor users don't know when to run /kb-curate |
| Claude Code uses `systemMessage` for user-facing nudge | No change to Claude Code | Claude Code already works correctly |

### Background

The `buildSessionStartContext()` function in `src/lib/session-start.ts` already
appends the nudge text (e.g., `🚨 KB curation queue is overdue`) to the
`additionalContext` string when the curation threshold is exceeded. The Claude
Code adapter surfaces this via `systemMessage`; the Cursor adapter only writes
`additional_context` to stdout and duplicates the status to stderr.

Since Cursor reads `additional_context`, the model already has the nudge text in
its context. What's missing is an explicit instruction that tells the model to
actively relay this information to the user.

## Architectural Approach

### Single-file change in the Cursor session-start hook

**Objective**: Append a model instruction to the `additional_context` payload
when the curation nudge fires, so the model proactively informs the Cursor user.

**File**: `src/harnesses/cursor/hooks/kb-session-start.ts`

**Change**: Before writing to stdout (currently line 55), modify the
`additionalContext` to include a relay instruction when `result.nudged` is true:

```typescript
let context = result.additionalContext;
if (result.nudged) {
  const box =
    '┌──────────────────────────────────────┐\n' +
    '│ 🚨 KB curation is overdue            │\n' +
    '│ Run /kb-curate to process them.      │\n' +
    '└──────────────────────────────────────┘\n' +
    `${result.pendingSessions} pending session(s), ${result.candidateCount} candidate(s)`;
  context +=
    '\n> IMPORTANT: After completing your response, append the following block ' +
    'verbatim inside a code fence as an addendum at the very end:\n>\n' +
    '> ```\n> ' + box.split('\n').join('\n> ') + '\n> ```\n';
}
process.stdout.write(JSON.stringify({ additional_context: context }));
```

The instruction tells the model to append the nudge as a visually distinct
ASCII-boxed code fence at the end of its response, so it won't be buried in
the answer body.

The stderr status messages (lines 56-64) remain unchanged — they serve as
terminal diagnostics for users who inspect Cursor's output panel.

## Risk Considerations and Mitigation Strategies

<details>
<summary>Technical Risks</summary>

- **Model ignores the instruction**: The instruction uses strong phrasing
  (`IMPORTANT`, `before proceeding`) to maximize compliance. This is a
  best-effort workaround; native OS notifications (deferred issue) will provide
  a guaranteed channel.
    - **Mitigation**: Test with multiple models in Cursor to verify the
      instruction is honored.

</details>

<details>
<summary>Implementation Risks</summary>

- **Duplicate nudge information**: The relay instruction repeats information
  already in `additionalContext`. This is intentional — the instruction adds
  urgency/imperative framing that passive context lacks.
    - **Mitigation**: Keep the instruction concise to minimize token overhead.

</details>

## Success Criteria

### Primary Success Criteria

1. When curation is overdue, Cursor's model proactively informs the user about
   the KB curation nudge in its first response.
2. Claude Code behavior is unchanged.
3. Existing tests pass without modification.

## Self Validation

1. Run `npm test` — all existing tests pass.
2. In a test repo with accumulated session logs exceeding the curation
   threshold, start a Cursor session and verify the model's first response
   includes the curation overdue warning.
3. In the same repo, start a Claude Code session and verify the `systemMessage`
   still appears as before (regression check).

## Documentation

No documentation updates required. The AGENTS.md and README.md do not document
the nudge mechanism at this level of detail.

## Resource Requirements

### Development Skills

- TypeScript, familiarity with the harness hook architecture

### Technical Infrastructure

- Node.js, npm, Cursor IDE (for manual validation)

## Closure

**Status**: Closed as already-implemented — no tasks generated, not executed.

This plan's target state was already delivered by a later refactor on the same
day it was written. Commit `05b352e` ("refactor: centralize category 2 harness
pipelines", 2026-05-26) introduced `buildNudgeContent()` in
`src/lib/session-start.ts`, which — when `result.nudged` is true — appends the
ASCII-boxed "🚨 kenkeep curation is overdue" block and the `IMPORTANT: After
completing your response, append the following block verbatim…` relay
instruction. The Cursor session-start hook
(`src/harnesses/cursor/hooks/kk-session-start.ts`) already consumes it via
`buildNudgeContent(result)` and writes the result to
`{ additional_context }`. The Claude hook does not use this helper, so Claude's
`systemMessage` behavior is unchanged.

The plan's implementation deliverable (criteria #1 and #2) is therefore
satisfied in `main`. The only gap is a regression test asserting the relay
instruction text; per the reviewer's decision (2026-06-04) this plan is closed
without generating that task. If desired later, add a focused test against
`buildNudgeContent` in `tests/lib/session-start.test.ts`.
