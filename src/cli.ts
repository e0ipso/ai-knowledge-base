import { Command } from 'commander';
import { runDoctor } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runStatus } from './commands/status.js';
import { log } from './lib/log.js';
import { packageVersion } from './lib/version.js';

async function main(): Promise<void> {
  const program = new Command();
  program
    .name('ai-knowledge-base')
    .description('Build and maintain a per-repo knowledge base from AI coding sessions.')
    .version(packageVersion());

  program
    .command('init')
    .description('First-time setup: copy templates, install pre-commit hook, record version.')
    .requiredOption(
      '-a, --assistants <list>',
      'comma-separated list of assistants to wire up (v1 supports: claude)',
      (value: string) =>
        value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
    )
    .option('-f, --force', 'overwrite existing ai-knowledge-base files', false)
    .action(async (opts: { assistants: string[]; force?: boolean }) => {
      const initOpts: { assistants: string[]; force?: boolean } = { assistants: opts.assistants };
      if (opts.force) initOpts.force = true;
      await runInit(initOpts);
    });

  program
    .command('status')
    .description('Show pending session logs, pending proposals, and KB stats.')
    .action(async () => {
      await runStatus();
    });

  program
    .command('doctor')
    .description('Verify hook installation, gitleaks availability, and schema validity.')
    .option('-v, --verbose', 'show extra diagnostics', false)
    .action(async (opts: { verbose?: boolean }) => {
      const doctorOpts: { verbose?: boolean } = {};
      if (opts.verbose) doctorOpts.verbose = true;
      const code = await runDoctor(doctorOpts);
      process.exit(code);
    });

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    log.error(err.message);
  } else {
    log.error(String(err));
  }
  process.exit(1);
});
