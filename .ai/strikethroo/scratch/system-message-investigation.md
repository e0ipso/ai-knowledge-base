# System Message & Context Injection Across AI Coding Harnesses

**Date**: 2026-05-26
**Purpose**: Investigate whether harnesses other than Claude Code support system-message-like channels for hook-to-model communication, and document the exact mechanisms each harness provides.

---

## Executive Summary

None of the four harnesses have a true "system message" injection from hooks. Claude Code comes closest with `additionalContext` (wrapped in `<system-reminder>` tags). Codex CLI has a working `additionalContext` (injected as developer-role messages). Cursor has `additional_context` documented but **completely broken** in practice. OpenCode/Crush has no session-lifecycle hooks at all -- only `PreToolUse` with a `context` field appended to tool responses.

### Capability Matrix

| Capability | Claude Code | Codex CLI | Cursor | OpenCode/Crush |
|---|---|---|---|---|
| **`systemMessage` field** | User-facing warning only | TUI warning only | Does not exist | Does not exist |
| **`additionalContext` field** | Model-facing, in `<system-reminder>` tags | Model-facing, as developer-role messages | Documented but **broken** (race condition) | N/A |
| **SessionStart hook** | Yes (sync) | Yes (sync only, async not implemented) | Yes (but `additional_context` silently dropped) | No (only `PreToolUse`) |
| **Static file injection** | `CLAUDE.md` | `INSTRUCTIONS.md` / config | `.cursor/rules/*.mdc` (works well) | `contextPaths` config (`opencode.md`, `AGENTS.md`, etc.) |
| **Mid-session injection** | `additionalContext` on PreToolUse, PostToolUse, UserPromptSubmit, etc. | `additionalContext` on PreToolUse, PostToolUse, UserPromptSubmit | `agent_message` on deny only (also bugged) | `context` field on `PreToolUse` only |
| **Hook event count** | 29 events | 10 events | ~20 events | 1 event (PreToolUse) |
| **Async hooks** | Yes | Config exists, not implemented | Varies by event | N/A |

---

## 1. Claude Code

**Source**: Official docs at https://code.claude.com/docs/en/hooks, GitHub repo analysis

### Hook Output Protocol

Hooks write JSON to stdout. The schema has **universal fields** (all events) and **event-specific fields** inside `hookSpecificOutput`.

```json
{
  "continue": true,
  "stopReason": "string",
  "suppressOutput": false,
  "systemMessage": "Warning shown to human user in TUI",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Text injected into model context as <system-reminder>"
  }
}
```

### `systemMessage` (universal field)

- **Audience**: Human user only (displayed in terminal UI)
- **NOT** injected into the model's context window
- **NOT** a system-level message to the LLM
- Available on all 29 hook events

### `additionalContext` (event-specific field)

- **Audience**: The model (Claude)
- Wrapped in `<system-reminder>` tags and inserted into the conversation at the point the hook fired
- **10,000 character limit** -- exceeding this writes to a file and provides a path + preview
- Does NOT appear as a visible chat message to the user

**Events supporting `additionalContext`:**
- `SessionStart`, `Setup`, `SubagentStart`
- `UserPromptSubmit`, `UserPromptExpansion`
- `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`

**Events that do NOT support it:**
- `Stop`, `SubagentStop`, `SessionEnd`, `FileChanged`, `PostCompact`, `InstructionsLoaded`, `StopFailure`, `CwdChanged`, `WorktreeCreate`, `WorktreeRemove`, `Notification`, `ConfigChange`, `PreCompact`, `Elicitation`, `ElicitationResult`, `PermissionRequest`, `PermissionDenied`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`

### Additional Mechanisms

- **`initialUserMessage`** (SessionStart only): Creates an actual user turn in conversation
- **`watchPaths`** (SessionStart only): Monitors file paths and fires `FileChanged` events (but `FileChanged` doesn't support `additionalContext`)
- **`followup_message`**: Not documented in Claude Code (Cursor-specific)

### How This Project Uses It

The `kb-session-start.ts` hook outputs:
```json
{
  "systemMessage": "status line shown to user",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "KB INDEX content injected into model context"
  }
}
```

This is the **gold standard** among the harnesses -- clean separation of user-facing status (`systemMessage`) and model-facing context (`additionalContext`).

---

## 2. OpenAI Codex CLI

**Source**: GitHub repo at https://github.com/openai/codex, Rust source code analysis (`codex-rs/hooks/`)

### Hook Output Protocol

Nearly identical JSON schema to Claude Code (intentional compatibility):

```json
{
  "continue": true,
  "stopReason": null,
  "suppressOutput": false,
  "systemMessage": "Warning shown in TUI (NOT sent to model)",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Text injected as developer-role message"
  }
}
```

### `systemMessage` (universal field)

- **Audience**: Human user only (rendered as "warning: " prefix in TUI)
- Treated as `HookOutputEntryKind::Warning`
- **NOT** injected into model context

### `additionalContext` (event-specific field)

- **Audience**: The model
- Injected as **developer-role messages** in the conversation history
- **No `<system-reminder>` wrapping** -- text appears verbatim
- For `SessionStart` and `UserPromptSubmit`, plain (non-JSON) stdout is automatically treated as `additionalContext`

**Events supporting `additionalContext`:**
- `SessionStart`, `SubagentStart`
- `PreToolUse`, `PostToolUse`
- `UserPromptSubmit`

### 10 Supported Events

`SessionStart`, `SubagentStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `Stop`, `SubagentStop`

### Key Differences from Claude Code

1. `additionalContext` is injected as **developer-role messages**, not system-reminder-tagged content
2. Plain stdout fallback -- non-JSON output on SessionStart/UserPromptSubmit is auto-treated as additionalContext
3. **Async hooks are NOT implemented** -- config field exists but hooks are skipped with a warning
4. Exit code 2 = blocking (stderr becomes the deny reason), same as Claude Code

### How This Project Uses It

The `kb-session-start.ts` hook outputs `{ "additionalContext": "..." }` directly. For nudges, it uses a prompt-injection workaround:
```
> IMPORTANT: After completing your response, append the following block
> verbatim inside a code fence as an addendum at the very end:
```

This workaround is necessary because there's no separate `systemMessage`-to-user channel that reliably surfaces in the Codex TUI. stderr is used instead for user-facing status messages.

---

## 3. Cursor

**Source**: Official docs at https://cursor.com/docs/hooks, https://cursor.com/docs/rules, forum bug reports

### Hook Output Protocol

Different JSON field names than Claude/Codex (snake_case, different structure):

```json
{
  "additional_context": "Text intended for model (BROKEN)",
  "agent_message": "Text sent to model on deny",
  "user_message": "Text shown to human user",
  "permission": "allow|deny|ask",
  "updated_input": {},
  "followup_message": "Auto-submitted as next user message"
}
```

### No `systemMessage` Field

Cursor hooks have **no `systemMessage` or `system_message` field** at all. The user-facing channel is `user_message`.

### `additional_context` (BROKEN as of May 2026)

- **Documented** on `sessionStart` and `postToolUse` events
- **`sessionStart`**: Race condition -- hook runs asynchronously before the composer handle is created. Context is "merged successfully" in logs but **silently dropped** before reaching the model. (Forum: /t/158452)
- **`postToolUse`**: For non-MCP tools, hook response is entirely discarded (fire-and-forget). For MCP tools, only `updated_mcp_tool_output` is consumed; `additional_context` is ignored. Hook also executes async after tool results return, so model has already moved on. (Forum: /t/155689)
- **`beforeSubmitPrompt`**: Does NOT support `additional_context` at all. Active feature requests. (Forum: /t/150707)
- **`afterFileEdit`**: Does NOT support `additional_context`. Active feature requests. (Forum: /t/153090)

**Bottom line: `additional_context` does not reach the model in any Cursor hook type.**

### `agent_message` (Partial, Bugged)

- Available on `preToolUse`, `beforeShellExecution`, `beforeMCPExecution`
- Sends text to the model when an action is **denied**
- Suffered a regression since v2.0.64 where it stopped reaching model context
- Only works in denial contexts -- cannot be used for general context injection

### ~20 Supported Events

`sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`, `workspaceOpen`, `beforeTabFileRead`, `afterTabFileEdit`

### The Working Alternative: Rules System

The `.cursor/rules/*.mdc` files are the **only reliable mechanism** for context injection in Cursor. Contents are "included at the start of the model context" (system prompt level). However, rules are **static files** -- they cannot provide dynamic hook output.

### How This Project Uses It

The `kb-session-start.ts` hook outputs `{ "additional_context": "..." }`. Given the findings above, **this context never reaches the model in Cursor**. The OpenCode-style workaround (writing to a file that Cursor rules reference) may be more reliable.

**This is a significant finding: the Cursor adapter's session-start hook is likely a no-op for context injection.**

---

## 4. OpenCode / Crush

**Source**: GitHub repos (opencode-ai/opencode archived, charmbracelet/crush), Go source code analysis

### Critical Note: OpenCode Has Been Archived

OpenCode was archived and renamed to **Crush** by Charmbracelet. The hooks system exists **only in Crush**, not in the original OpenCode.

### No Session Lifecycle Hooks

**OpenCode**: Zero extension points. Monolithic Go, no hooks, no plugins, no event bus.

**Crush**: Only **one hook event**: `PreToolUse`. No `SessionStart`, `SessionEnd`, or `session.created` events are exposed to hooks.

Planned but **not implemented** (from `docs/hooks/FUTURE.md`):
- `UserPromptSubmit` -- would fire before LLM call
- Sub-agent opt-in

### Hook Output Protocol (Crush only)

```json
{
  "version": 1,
  "decision": "allow|deny|null",
  "halt": false,
  "reason": "...",
  "context": "string appended to tool response content",
  "updated_input": {}
}
```

### `context` Field (PreToolUse only)

- Appended to the tool response content (the tool's actual output)
- Not a system message, not a system reminder -- just concatenated to what the model sees as the tool's result
- Only fires per-tool-call, no session-start equivalent

### Static File Injection via `contextPaths`

Both OpenCode and Crush load files from configured paths into the system prompt:

**OpenCode defaults**: `.github/copilot-instructions.md`, `.cursorrules`, `.cursor/rules/`, `CLAUDE.md`, `CLAUDE.local.md`, `opencode.md`, `opencode.local.md`, `OpenCode.md`, etc.

**Crush additionally**: `crush.md`, `CRUSH.md`, `AGENTS.md`

These are loaded at startup into `# Project-Specific Context` in the system prompt.

### How This Project Uses It

The `kb-session-start.ts` hook writes context to `.opencode/AGENTS.md` as a file-based workaround since OpenCode has no stdout-based context injection. The plugin shim (`kb.ts`) dispatches to per-event scripts but stdout from those scripts is `'inherit'` (goes to terminal), not captured for model injection.

---

## Implications for This Project

### Current Adapter Correctness

| Adapter | Context Injection | Actually Works? |
|---|---|---|
| **Claude** | `additionalContext` in `hookSpecificOutput` | **YES** -- gold standard |
| **Codex** | `additionalContext` in stdout JSON | **YES** -- as developer-role messages |
| **Cursor** | `additional_context` in stdout JSON | **NO** -- silently dropped due to race condition |
| **OpenCode** | Write to `.opencode/AGENTS.md` file | **PARTIAL** -- only if user references the file |

### The `systemMessage` Misconception

The Claude adapter currently uses `systemMessage` in its hook output. Based on this investigation:
- In **Claude Code**: `systemMessage` is a user-facing TUI warning, not model-facing
- In **Codex CLI**: Same -- TUI warning only
- In **Cursor**: Field does not exist
- In **OpenCode/Crush**: Field does not exist

The project's Claude adapter outputs both `systemMessage` (for user status) and `additionalContext` (for model context), which correctly uses both channels. The Codex adapter uses stderr for status, which also works. **The Cursor adapter's hook output is likely dead code for context injection.**

### Recommendations

1. **Cursor adapter needs a workaround**: Consider the OpenCode approach (write to `.cursor/rules/kb-context.mdc` or similar) since the `additional_context` stdout channel is broken. Alternatively, wait for Cursor to fix the race condition.

2. **Codex adapter difference to note**: Codex injects `additionalContext` as developer-role messages, not `<system-reminder>`-tagged system content. This means the model may weigh it differently than in Claude Code.

3. **OpenCode/Crush is a moving target**: The project's current OpenCode adapter targets the archived OpenCode. Crush has a different (and very limited) hooks API. The `.opencode/AGENTS.md` workaround still works for Crush since it reads `AGENTS.md` from contextPaths.

4. **No harness supports arbitrary mid-session injection**: All harnesses are event-driven. There is no mechanism to push content into the model's context at arbitrary times outside of hook events.

### Feature Parity Gaps

```
                        Claude    Codex    Cursor    OpenCode/Crush
SessionStart context      [x]      [x]      [ ]         [ ]
UserPromptSubmit ctx      [x]      [x]      [ ]         [ ]
PreToolUse context        [x]      [x]      [ ]         [x]*
PostToolUse context       [x]      [x]      [ ]         [ ]
User-facing status        [x]      [x]**    [ ]         [ ]
Async hooks               [x]      [ ]      varies      [ ]

[x] = working   [ ] = not available or broken
* = Crush only, as tool-response append
** = via stderr, not systemMessage
```

---

## Sources

### Claude Code
- https://code.claude.com/docs/en/hooks
- https://github.com/anthropics/claude-code (plugin-dev skills, hookify examples)

### Codex CLI
- https://github.com/openai/codex
- `codex-rs/hooks/src/schema.rs` (wire format definitions)
- `codex-rs/hooks/src/engine/` (command_runner, output_parser, dispatcher)
- `codex-rs/hooks/src/events/` (per-event implementations)

### Cursor
- https://cursor.com/docs/hooks
- https://cursor.com/docs/rules
- https://forum.cursor.com/t/sessionstart-hook-additional-context-is-never-injected/158452
- https://forum.cursor.com/t/native-posttooluse-hooks-accept-and-log-additional-context-but-not-surfaced/155689
- https://forum.cursor.com/t/hooks-allow-beforesubmitprompt-hook-to-inject-additional-context/150707
- https://blog.gitbutler.com/cursor-hooks-deep-dive

### OpenCode / Crush
- https://github.com/opencode-ai/opencode (archived)
- https://github.com/charmbracelet/crush
- `crush/internal/hooks/hooks.go` (hook types and decisions)
- `crush/internal/agent/hooked_tool.go` (context injection into tool responses)
- `crush/docs/hooks/FUTURE.md` (planned but unimplemented events)
