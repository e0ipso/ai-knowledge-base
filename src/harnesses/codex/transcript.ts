import type { RoleTaggedTranscript } from '../types.js';

/**
 * Parses a Codex rollout JSONL file into the canonical role-tagged
 * transcript shape. Implemented by Task 9; this stub keeps the adapter
 * typechecking and fails loudly if the unimplemented path is exercised.
 */
export function parseCodexTranscript(_text: string): RoleTaggedTranscript {
  throw new Error(
    'parseCodexTranscript is not implemented yet (lands in Task 9 of plan 22).'
  );
}

/**
 * Renders a role-tagged transcript using Codex's `[USER]:` / `[AGENT]:`
 * conventions. Implemented by Task 9; this stub mirrors the Claude
 * renderer signature so the adapter contract is satisfied.
 */
export function renderCodexTranscript(_t: RoleTaggedTranscript): string {
  throw new Error(
    'renderCodexTranscript is not implemented yet (lands in Task 9 of plan 22).'
  );
}
