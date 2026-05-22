/**
 * Extracts a parseable JSON payload from raw LLM text.
 *
 * LLMs are prompted to emit raw JSON but sometimes wrap it in a Markdown
 * fence (```json ... ``` or ``` ... ```) or precede it with prose. This
 * helper normalizes the common shapes so `JSON.parse` succeeds; on no match
 * it returns the trimmed input unchanged so the caller's existing parse
 * error fires.
 *
 * Resolution order:
 *   1. Trimmed input already starts with `{` or `[`  → return as-is.
 *   2. First fenced block whose contents look like JSON → return inner.
 *   3. Last balanced `{...}` or `[...]` span (string-aware) → return it.
 *   4. Otherwise → return the trimmed input.
 */
export function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return trimmed;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

  const fenced = extractFromFence(trimmed);
  if (fenced !== null) return fenced;

  const balanced = extractLastBalanced(trimmed);
  if (balanced !== null) return balanced;

  return trimmed;
}

const FENCE_RE = /```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```/g;

function extractFromFence(text: string): string | null {
  FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE_RE.exec(text)) !== null) {
    const inner = match[1]?.trim() ?? '';
    if (inner.startsWith('{') || inner.startsWith('[')) return inner;
  }
  return null;
}

function extractLastBalanced(text: string): string | null {
  let best: { start: number; end: number } | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== '{' && ch !== '[') continue;
    const end = findBalancedEnd(text, i);
    if (end !== -1) {
      best = { start: i, end };
      i = end;
    }
  }
  if (!best) return null;
  return text.slice(best.start, best.end + 1);
}

function findBalancedEnd(text: string, start: number): number {
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
