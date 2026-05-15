/**
 * session.created async handler for the OpenCode adapter.
 *
 * Placeholder body. Task 5 wires this into the shared proposal-drain
 * pipeline.
 */
const PACKAGE_TAG = '[ai-knowledge-base]';

async function main(): Promise<void> {
  if (process.env['KB_BUILDER_INTERNAL'] === '1') return;
  process.stderr.write(`${PACKAGE_TAG} opencode kb-proposal-drain: not implemented yet\n`);
}

void main().catch(() => process.exit(0));
