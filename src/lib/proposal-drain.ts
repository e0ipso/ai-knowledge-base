import matter from 'gray-matter';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ZodSchema } from 'zod';
import {
  ProposalOutputSchema,
  type EffortLevel,
  type ModelFamily,
} from './schemas.js';
import { acquireLock, releaseLock } from './state.js';
import { compactStamp } from './time.js';

export const DEFAULT_MAX_ENTRIES = 5;
export const DEFAULT_TIMEOUT_MS = 60_000;
export const PROPOSAL_LOCK_NAME = 'proposal-drain';
export const MAX_PROPOSAL_ERROR_LEN = 500;

export type ProposalRunner = <T>(
  promptBody: string,
  stdin: string,
  schema: ZodSchema<T>,
  opts: {
    timeoutMs: number;
    allowedTools?: string[];
    logFile?: string;
    model?: ModelFamily;
    effort?: EffortLevel;
  }
) => Promise<T>;

export interface DrainContext {
  sessionsDir: string;
  logsDir: string;
  stateFile: string;
  promptTemplate: string;
  runner: ProposalRunner;
  now?: () => Date;
  maxEntries?: number;
  timeoutMs?: number;
  lockTtlMs?: number;
  pid?: number;
  model?: ModelFamily;
  effort?: EffortLevel;
}

export type DrainEntryStatus = 'done' | 'failed';

export interface DrainEntryResult {
  sessionId: string;
  status: DrainEntryStatus;
  error?: string;
  logFile?: string;
}

export interface DrainSummary {
  status: 'locked' | 'completed';
  processed: DrainEntryResult[];
  remaining: number;
  reason?: string;
}

export const TRANSCRIPT_PLACEHOLDER = '[TRANSCRIPT PLACEHOLDER - substituted at runtime]';

interface PendingSessionLog {
  sessionId: string;
  file: string;
}

/**
 * Drains pending session logs. Acquires a lock on `state.json`, sweeps
 * `_sessions/*.md`, processes every log whose frontmatter has
 * `proposal_status: 'pending'` up to `maxEntries`, and writes the outcome
 * back into the same frontmatter (`done` or `failed`). No retries: a failed
 * log stays `failed` until a human intervenes.
 */
export async function drainProposalQueue(ctx: DrainContext): Promise<DrainSummary> {
  const now = ctx.now ?? (() => new Date());
  const maxEntries = ctx.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const timeoutMs = ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pid = ctx.pid ?? process.pid;

  const lockHeld = acquireLock(ctx.stateFile, {
    name: PROPOSAL_LOCK_NAME,
    pid,
    now: now(),
    ...(ctx.lockTtlMs !== undefined ? { ttlMs: ctx.lockTtlMs } : {}),
  });
  if (!lockHeld) {
    return { status: 'locked', processed: [], remaining: countPending(ctx.sessionsDir) };
  }

  const processed: DrainEntryResult[] = [];
  try {
    const pending = listPending(ctx.sessionsDir);
    for (const entry of pending) {
      if (processed.length >= maxEntries) break;
      const result = await processSessionLog({
        entry,
        sessionsDir: ctx.sessionsDir,
        logsDir: ctx.logsDir,
        promptTemplate: ctx.promptTemplate,
        runner: ctx.runner,
        now,
        timeoutMs,
        ...(ctx.model !== undefined ? { model: ctx.model } : {}),
        ...(ctx.effort !== undefined ? { effort: ctx.effort } : {}),
      });
      processed.push(result);
    }
  } finally {
    releaseLock(ctx.stateFile, PROPOSAL_LOCK_NAME, pid);
  }

  const remaining = countPending(ctx.sessionsDir);
  return { status: 'completed', processed, remaining };
}

function listPending(sessionsDir: string): PendingSessionLog[] {
  if (!existsSync(sessionsDir)) return [];
  const names = readdirSync(sessionsDir)
    .filter(name => name.endsWith('.md') && !name.startsWith('.'))
    .sort();
  const out: PendingSessionLog[] = [];
  for (const name of names) {
    const file = join(sessionsDir, name);
    const data = readFrontmatter(file);
    if (!data) continue;
    if (data['proposal_status'] !== 'pending') continue;
    const sessionId = typeof data['session_id'] === 'string' ? data['session_id'] : name;
    out.push({ sessionId, file });
  }
  return out;
}

function countPending(sessionsDir: string): number {
  return listPending(sessionsDir).length;
}

function readFrontmatter(file: string): Record<string, unknown> | null {
  try {
    const parsed = matter(readFileSync(file, 'utf8'));
    return parsed.data as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface ProcessArgs {
  entry: PendingSessionLog;
  sessionsDir: string;
  logsDir: string;
  promptTemplate: string;
  runner: ProposalRunner;
  now: () => Date;
  timeoutMs: number;
  model?: ModelFamily;
  effort?: EffortLevel;
}

async function processSessionLog(args: ProcessArgs): Promise<DrainEntryResult> {
  const { entry, sessionsDir, logsDir, promptTemplate, runner, now, timeoutMs, model, effort } =
    args;
  const parsed = matter(readFileSync(entry.file, 'utf8'));
  const transcript = extractTranscript(parsed.content);
  const prompt = buildProposalPrompt(promptTemplate, transcript);
  const startedAt = now();
  const logFile = proposalLogPath(logsDir, entry.sessionId, startedAt);

  try {
    const out = await runner(prompt, '', ProposalOutputSchema, {
      timeoutMs,
      allowedTools: [],
      logFile,
      ...(model !== undefined ? { model } : {}),
      ...(effort !== undefined ? { effort } : {}),
    });
    writeSessionLogFrontmatter(entry.file, parsed, {
      proposal_status: 'done',
      proposal_completed_at: now().toISOString(),
      proposal_error: null,
      proposal_log: relativeLogPath(sessionsDir, logFile),
      proposals: { practice: out.practice, map: out.map },
    });
    return { sessionId: entry.sessionId, status: 'done', logFile };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const truncated = message.length > MAX_PROPOSAL_ERROR_LEN
      ? `${message.slice(0, MAX_PROPOSAL_ERROR_LEN)}...`
      : message;
    writeSessionLogFrontmatter(entry.file, parsed, {
      proposal_status: 'failed',
      proposal_completed_at: now().toISOString(),
      proposal_error: truncated,
      proposal_log: relativeLogPath(sessionsDir, logFile),
    });
    return { sessionId: entry.sessionId, status: 'failed', error: truncated, logFile };
  }
}

function extractTranscript(body: string): string {
  const startMatch = body.match(/## Transcript\s*\n+/);
  if (!startMatch || startMatch.index === undefined) return body.trim();
  const start = startMatch.index + startMatch[0].length;
  const rest = body.slice(start);
  const endMatch = rest.match(/\n## Proposal/);
  if (!endMatch) return rest.trim();
  return rest.slice(0, endMatch.index).trim();
}

export function buildProposalPrompt(template: string, transcript: string): string {
  if (!template.includes(TRANSCRIPT_PLACEHOLDER)) {
    throw new Error(
      `proposal-extract prompt is missing the ${TRANSCRIPT_PLACEHOLDER} placeholder; the prompt template must contain it verbatim`,
    );
  }
  return template.replace(TRANSCRIPT_PLACEHOLDER, transcript);
}

export function proposalLogPath(logsDir: string, sessionId: string, when: Date): string {
  const stamp = compactStamp(when);
  return join(logsDir, 'proposal', `${sessionId}__${stamp}.jsonl`);
}

function relativeLogPath(sessionsDir: string, logFile: string): string {
  // Store paths relative to the knowledge-base root for cross-machine portability.
  // sessionsDir = .ai/knowledge-base/_sessions; the kb root is its parent.
  const kbRoot = join(sessionsDir, '..');
  const rel = logFile.startsWith(kbRoot)
    ? logFile.slice(kbRoot.length).replace(/^[\\/]/, '')
    : logFile;
  return rel;
}

interface FrontmatterPatch {
  proposal_status: 'done' | 'failed';
  proposal_completed_at: string | null;
  proposal_error: string | null;
  proposal_log: string | null;
  proposals?: { practice: unknown[]; map: unknown[] };
}

function writeSessionLogFrontmatter(
  file: string,
  parsed: matter.GrayMatterFile<string>,
  patch: FrontmatterPatch
): void {
  const data = { ...(parsed.data as Record<string, unknown>) };
  data['proposal_status'] = patch.proposal_status;
  data['proposal_completed_at'] = patch.proposal_completed_at;
  data['proposal_error'] = patch.proposal_error;
  data['proposal_log'] = patch.proposal_log;
  if (patch.proposals) data['proposals'] = patch.proposals;
  const body = updateProposalBody(parsed.content, patch);
  const serialized = matter.stringify(body, data);
  writeFileSync(file, serialized);
}

function updateProposalBody(content: string, patch: FrontmatterPatch): string {
  if (patch.proposal_status !== 'done') return content;
  // Replace the "(populated by proposal worker)" placeholder with a brief
  // summary so a human browsing the session log can see what the extractor
  // produced without opening the stream-json log.
  return content.replace(
    /\(populated by proposal worker\)/,
    `_Extraction complete; see proposals in frontmatter._`
  );
}
