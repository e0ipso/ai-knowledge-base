/**
 * session.idle handler for the OpenCode adapter.
 *
 * Placeholder body. The real disk-parse-with-export-fallback transcript
 * pipeline is implemented in Task 6.
 */
const PACKAGE_TAG = '[ai-knowledge-base]';

async function main(): Promise<void> {
  if (process.env['KB_BUILDER_INTERNAL'] === '1') return;
  process.stderr.write(`${PACKAGE_TAG} opencode kb-capture: not implemented yet\n`);
}

void main().catch(() => process.exit(0));
