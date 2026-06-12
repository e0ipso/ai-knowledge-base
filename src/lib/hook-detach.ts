import { spawn } from 'node:child_process';

/** Marks the re-spawned background child so it runs the work inline. */
export const DETACHED_ENV = 'KENKEEP_DRAIN_DETACHED';
/** Carries the already-read hook stdin payload into the detached child. */
export const PAYLOAD_ENV = 'KENKEEP_HOOK_PAYLOAD';

export function isDetachedChild(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[DETACHED_ENV] === '1';
}

export function detachedPayload(env: NodeJS.ProcessEnv = process.env): string {
  return env[PAYLOAD_ENV] ?? '';
}

/**
 * Re-spawns the current hook script as a detached background child carrying
 * the already-read stdin payload, freeing the host harness's hook slot
 * immediately. Hosts without async hook support (Cursor, Codex, Copilot)
 * otherwise block session start on the drain's headless LLM runs — measured
 * at up to the full 30s hook timeout per session with a backlog, with the
 * host killing the hook mid-run. The detached child lives in its own
 * process group, so a host-side timeout kill of the hook cannot reach it;
 * the drain's state lock keeps concurrent children from double-processing.
 *
 * Returns true when the child was spawned (the caller exits, work continues
 * in the background); false when re-spawning is impossible (the caller
 * should fall back to inline work).
 */
export function detachSelf(rawPayload: string): boolean {
  const script = process.argv[1];
  if (!script) return false;
  const child = spawn(process.execPath, [script], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, [DETACHED_ENV]: '1', [PAYLOAD_ENV]: rawPayload },
  });
  child.unref();
  return true;
}
