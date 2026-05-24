import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { log } from '../lib/log.js';
import { writeSessionLogFrontmatter, type FrontmatterPatch } from '../lib/proposal-drain.js';
import { ProposalOutputSchema } from '../lib/schemas.js';

export interface SessionLogUpdateProposalsOptions {
  path: string;
  status: string;
  error?: string | undefined;
}

async function readStdin(): Promise<string> {
  return new Promise((resolveStdin, rejectStdin) => {
    if (process.stdin.isTTY) {
      resolveStdin('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolveStdin(data));
    process.stdin.on('error', rejectStdin);
  });
}

export async function runSessionLogUpdateProposalsCommand(
  opts: SessionLogUpdateProposalsOptions
): Promise<number> {
  const status = opts.status;
  if (status !== 'done' && status !== 'failed') {
    log.error('--status must be "done" or "failed".');
    return 1;
  }

  const filePath = resolve(process.cwd(), opts.path);
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(readFileSync(filePath, 'utf8'));
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  const sessionId = parsed.data['session_id'];
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    log.error('session log frontmatter missing session_id.');
    return 1;
  }

  const completedAt = new Date().toISOString();

  if (status === 'failed') {
    const patch: FrontmatterPatch = {
      proposal_status: 'failed',
      proposal_completed_at: completedAt,
      proposal_error: opts.error ?? 'unknown error',
      proposal_log: null,
    };
    writeSessionLogFrontmatter(filePath, parsed, patch);
    process.stdout.write(`${sessionId}\n`);
    return 0;
  }

  const raw = await readStdin();
  if (raw.trim().length === 0) {
    log.error('stdin is empty; expected proposal JSON for --status done.');
    return 1;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch (err) {
    log.error(`invalid JSON on stdin: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  const validated = ProposalOutputSchema.safeParse(json);
  if (!validated.success) {
    log.error(`proposal JSON failed schema validation: ${validated.error.message}`);
    return 1;
  }

  const patch: FrontmatterPatch = {
    proposal_status: 'done',
    proposal_completed_at: completedAt,
    proposal_error: null,
    proposal_log: null,
    proposals: {
      practice: validated.data.practice,
      map: validated.data.map,
    },
  };
  writeSessionLogFrontmatter(filePath, parsed, patch);
  process.stdout.write(`${sessionId}\n`);
  return 0;
}
