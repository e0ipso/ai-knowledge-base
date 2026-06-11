/**
 * Parses a GitHub Copilot CLI `events.jsonl` stream into the canonical
 * role-tagged transcript structure shared across harnesses.
 *
 * Copilot writes one JSON object per line under
 * `${COPILOT_HOME:-~/.copilot}/session-state/<sessionID>/events.jsonl`. The
 * envelope is `{ type, data, id, timestamp, parentId }` (measured against
 * Copilot CLI v1.0.61). The message events of interest are:
 *   - `type: "user.message"` — user turn, text at `data.content`.
 *   - `type: "assistant.message"` — assistant turn, text at `data.content`
 *     (may also carry `data.toolRequests`, which this parser ignores).
 * There is no `data.role` field on message events. Every other event type
 * (`assistant.turn_start` / `assistant.turn_end`, `session.*`, `hook.*`,
 * `system.message`, and tool events such as `tool.execution_start`) is
 * ignored gracefully.
 *
 * Chunked streaming output (several events sharing a grouping key and role)
 * is concatenated into a single turn. The grouping key is the envelope/`data`
 * `turnId` when present, falling back to `parentId`. Independent events
 * (different grouping key) become separate turns even when they share a role.
 * Lines that fail `JSON.parse` (including a truncated final line) are skipped
 * silently, so a partially written file never crashes capture. A missing or
 * empty file yields `{ interleaved: [] }`.
 */
import type { RoleTaggedTranscript } from '../types.js';
import { renderRoleTagged } from '../../lib/transcript-render.js';

interface CopilotEvent {
  type?: string;
  timestamp?: string;
  parentId?: string | null;
  turnId?: string | null;
  data?: {
    content?: unknown;
    turnId?: string | null;
  };
}

type Role = 'user' | 'agent';

interface ParsedTurn {
  role: Role;
  text: string;
  timestamp: string;
  group: string | null;
  order: number;
}

function classify(event: CopilotEvent): Role | null {
  if (event.type === 'user.message') return 'user';
  if (event.type === 'assistant.message') return 'agent';
  return null;
}

function messageText(event: CopilotEvent): string {
  const content = event.data?.content;
  if (typeof content === 'string' && content.length > 0) return content;
  return '';
}

function groupKey(event: CopilotEvent): string | null {
  if (typeof event.turnId === 'string') return event.turnId;
  if (typeof event.data?.turnId === 'string') return event.data.turnId;
  if (typeof event.parentId === 'string') return event.parentId;
  return null;
}

export function parseCopilotTranscript(text: string): RoleTaggedTranscript {
  const turns: ParsedTurn[] = [];
  let order = 0;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    let event: CopilotEvent;
    try {
      event = JSON.parse(line) as CopilotEvent;
    } catch {
      // Skip malformed or truncated lines without throwing.
      continue;
    }
    const role = classify(event);
    if (role === null) continue;
    const body = messageText(event);
    if (body.length === 0) continue;
    turns.push({
      role,
      text: body,
      timestamp: typeof event.timestamp === 'string' ? event.timestamp : '',
      group: groupKey(event),
      order: order++,
    });
  }

  // Stable sort by timestamp, falling back to original line order so events
  // with equal or missing timestamps keep their stream order.
  turns.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? -1 : 1;
    return a.order - b.order;
  });

  const out: RoleTaggedTranscript = { interleaved: [] };
  let current: { role: Role; group: string | null; texts: string[] } | null = null;
  for (const turn of turns) {
    const sameGroup =
      current !== null &&
      current.role === turn.role &&
      turn.group !== null &&
      current.group === turn.group;
    if (sameGroup) {
      current!.texts.push(turn.text);
      continue;
    }
    if (current !== null) {
      out.interleaved.push({ role: current.role, text: current.texts.join('\n') });
    }
    current = { role: turn.role, group: turn.group, texts: [turn.text] };
  }
  if (current !== null) {
    out.interleaved.push({ role: current.role, text: current.texts.join('\n') });
  }

  return out;
}

/**
 * Renders a role-tagged transcript using the shared `[USER]:` / `[AGENT]:`
 * format. Copilot uses the same textual representation as every other
 * harness, so this is a thin pass-through over the shared renderer.
 */
export function renderCopilotTranscript(t: RoleTaggedTranscript): string {
  return renderRoleTagged(t);
}
