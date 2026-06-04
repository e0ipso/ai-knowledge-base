import type { RoleTaggedTranscript } from '../types.js';
import { renderRoleTagged } from '../../lib/transcript-render.js';

/**
 * Parses a Copilot `events.jsonl` stream into the canonical role-tagged
 * transcript structure. Body implemented in Plan 24 Task 4.
 */
export function parseCopilotTranscript(_text: string): RoleTaggedTranscript {
  throw new Error('parseCopilotTranscript not implemented');
}

/**
 * Renders a role-tagged transcript using the shared `[USER]:` / `[AGENT]:`
 * format. Copilot uses the same textual representation as every other
 * harness, so this is a thin pass-through over the shared renderer.
 */
export function renderCopilotTranscript(t: RoleTaggedTranscript): string {
  return renderRoleTagged(t);
}
