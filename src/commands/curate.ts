import { launchSkill } from '../lib/launch-skill.js';

export interface CurateLauncherOptions {
  harness?: string | undefined;
}

/**
 * Thin launcher for the `kk-curate` skill: resolves the active harness,
 * then execs `<harness-binary> -p "/kk-curate"` with
 * `KENKEEP_BUILDER_INTERNAL=1` on the child env and stdio inherited.
 *
 * The deterministic dedup pass lives in the `curate-dedup` primitive;
 * the model work itself lives in the in-host skill prompt. This command
 * is intentionally argument-less today — any future passthrough flags
 * should be wired here.
 */
export function runCurateLauncher(opts: CurateLauncherOptions = {}): void {
  const launchOpts: Parameters<typeof launchSkill>[0] = {
    skill: 'kk-curate',
    passedArgs: '',
  };
  if (opts.harness !== undefined) launchOpts.harness = opts.harness;
  launchSkill(launchOpts);
}
