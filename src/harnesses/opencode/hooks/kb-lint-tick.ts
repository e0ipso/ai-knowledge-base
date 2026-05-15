/**
 * session.idle handler for the OpenCode adapter.
 *
 * Placeholder body. Task 5 wires this into the shared lint-tick
 * pipeline used by Codex's Stop hook.
 */
const PACKAGE_TAG = '[ai-knowledge-base]';

async function main(): Promise<void> {
  if (process.env['KB_BUILDER_INTERNAL'] === '1') return;
  process.stderr.write(`${PACKAGE_TAG} opencode kb-lint-tick: not implemented yet\n`);
}

void main().catch(() => process.exit(0));
