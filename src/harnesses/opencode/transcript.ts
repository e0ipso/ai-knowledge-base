import type { RoleTaggedTranscript } from '../types.js';
import { renderRoleTagged } from '../../lib/transcript-render.js';

/**
 * Placeholder transcript parser. The on-disk OpenCode storage layout
 * parser lives in Task 6's implementation; the adapter export here is
 * a thin shim that calls into the disk-tree parser when given a session
 * id, or returns an empty transcript when handed an arbitrary string.
 *
 * The adapter contract requires `parseTranscript(text: string)` to keep
 * the existing call sites portable; OpenCode's parser actually needs a
 * session id and a storage root rather than raw text. The kb-capture
 * hook script (Task 6) bypasses this adapter method and calls
 * `parseOpenCodeTranscript` directly. This placeholder exists so
 * generic code paths that walk every adapter (none today) can still
 * call `parseTranscript` without crashing.
 */
export function parseOpenCodeTranscriptText(_text: string): RoleTaggedTranscript {
  return { interleaved: [] };
}

export function renderOpenCodeTranscript(t: RoleTaggedTranscript): string {
  return renderRoleTagged(t);
}
