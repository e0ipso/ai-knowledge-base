/**
 * Parses a Codex rollout JSONL file into the canonical role-tagged
 * transcript structure shared across harnesses. Codex emits two interleaved
 * line shapes that both convey turn text: `response_item` (structured model
 * I/O) and `event_msg` (high-level lifecycle events). For each line we
 * decide whether to emit a turn or skip it; malformed lines are logged and
 * skipped so a single bad line cannot poison the whole transcript.
 *
 * Dedupe heuristic: Codex often emits both a `response_item/message/assistant`
 * line and a trailing `event_msg/task_complete` echo carrying the same
 * final agent message. We keep the structured one and drop the echo by
 * suppressing `task_complete` whenever the previously emitted turn is an
 * agent turn with matching text.
 */
import type { RoleTaggedTranscript } from '../types.js';
import { renderRoleTagged } from '../../lib/transcript-render.js';

interface RolloutLine {
  type?: string;
  payload?: {
    type?: string;
    role?: string;
    content?: Array<{ type?: string; text?: string }>;
    message?: string;
    last_agent_message?: string;
  };
}

function extractMessageText(line: RolloutLine): string {
  const blocks = line.payload?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter(b => !!b && typeof b === 'object')
    .filter(b => typeof b.type === 'string' && b.type.endsWith('_text'))
    .map(b => (typeof b.text === 'string' ? b.text : ''))
    .filter(s => s.length > 0)
    .join('\n');
}

export function parseCodexTranscript(text: string): RoleTaggedTranscript {
  const out: RoleTaggedTranscript = { interleaved: [] };
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    let parsed: RolloutLine;
    try {
      parsed = JSON.parse(line) as RolloutLine;
    } catch (err) {
      console.warn(
        `parseCodexTranscript: skipping malformed JSONL line: ${(err as Error).message}`
      );
      continue;
    }
    const kind = parsed.type;
    const payloadType = parsed.payload?.type;
    if (kind === 'session_meta') continue;
    if (kind === 'response_item' && payloadType === 'message') {
      const role = parsed.payload?.role;
      const turnText = extractMessageText(parsed);
      if (!turnText) continue;
      if (role === 'user') {
        out.interleaved.push({ role: 'user', text: turnText });
      } else if (role === 'assistant') {
        out.interleaved.push({ role: 'agent', text: turnText });
      }
      continue;
    }
    if (kind === 'event_msg' && payloadType === 'user_message') {
      const message = parsed.payload?.message;
      if (typeof message === 'string' && message.length > 0) {
        out.interleaved.push({ role: 'user', text: message });
      }
      continue;
    }
    if (kind === 'event_msg' && payloadType === 'task_complete') {
      const message = parsed.payload?.last_agent_message;
      if (typeof message !== 'string' || message.length === 0) continue;
      const last = out.interleaved[out.interleaved.length - 1];
      if (last && last.role === 'agent' && last.text === message) continue;
      out.interleaved.push({ role: 'agent', text: message });
      continue;
    }
  }
  return out;
}

/**
 * Renders a role-tagged transcript using the shared `[USER]:` / `[AGENT]:`
 * format. Codex uses the same textual representation as every other
 * harness, so this is a thin pass-through over the shared renderer.
 */
export function renderCodexTranscript(t: RoleTaggedTranscript): string {
  return renderRoleTagged(t);
}
