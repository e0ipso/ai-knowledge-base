import type { RoleTaggedTranscript } from '../harnesses/types.js';

/**
 * Renders a role-tagged transcript in the `[USER]: ...` / `[AGENT]: ...`
 * form consumed by the proposal-extraction prompt and stored in session
 * logs. Used by every harness adapter: the textual format is the canonical
 * representation regardless of which CLI produced the original transcript.
 *
 * A user segment whose body is exactly `/self-review-apply <path>.xml` is
 * tagged `[USER /self-review-apply <path>]:` and the immediately following
 * agent segment, if any, is tagged `[AGENT NARRATION OF SELF-REVIEW <path>]:`.
 * This lets the proposal-extract prompt key off a fixed marker instead of
 * re-deriving the slash-command via regex over a variable filename.
 */
const SELF_REVIEW_APPLY_TRIGGER = /^\s*\/self-review-apply\s+(\S+\.xml)\s*$/;

export function renderRoleTagged(t: RoleTaggedTranscript): string {
  const segs = t.interleaved;
  const lines: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (!seg) continue;
    if (seg.role === 'user') {
      const match = SELF_REVIEW_APPLY_TRIGGER.exec(seg.text);
      if (match) {
        const path = match[1];
        lines.push(`[USER /self-review-apply ${path}]: ${seg.text}`);
        const next = segs[i + 1];
        if (next && next.role === 'agent') {
          lines.push(`[AGENT NARRATION OF SELF-REVIEW ${path}]: ${next.text}`);
          i += 1;
        }
        continue;
      }
      lines.push(`[USER]: ${seg.text}`);
    } else {
      lines.push(`[AGENT]: ${seg.text}`);
    }
  }
  return lines.join('\n\n');
}
