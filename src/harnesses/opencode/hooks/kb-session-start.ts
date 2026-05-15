/**
 * session.created handler for the OpenCode adapter.
 *
 * Placeholder body. Task 5 wires this into the shared session-start
 * pipeline used by Claude and Codex.
 */
const PACKAGE_TAG = '[ai-knowledge-base]';

async function main(): Promise<void> {
  if (process.env['KB_BUILDER_INTERNAL'] === '1') return;
  process.stderr.write(`${PACKAGE_TAG} opencode kb-session-start: not implemented yet\n`);
}

void main().catch(() => process.exit(0));
