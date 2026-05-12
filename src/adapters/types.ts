import type { ZodSchema } from 'zod';
import type { EffortLevel, ModelFamily } from '../lib/schemas.js';

export type HookEvent = 'Stop' | 'SessionEnd' | 'PreCompact' | 'SessionStart' | 'UserPromptSubmit';

export interface HookSpec {
  event: HookEvent;
  scriptPath: string; // relative to hookInstallPath()
  matcher?: string;
  async?: boolean;
}

export interface SkillSpec {
  name: string;
  description: string;
  body: string;
  allowedTools?: string;
}

export interface HeadlessOpts {
  timeoutMs?: number;
  allowedTools?: string[];
  logFile?: string;
  model?: ModelFamily;
  effort?: EffortLevel;
  onMessage?: (msg: unknown) => void;
}

export interface RoleTaggedTranscript {
  user: string[];
  agent: string[];
  interleaved: Array<{ role: 'user' | 'agent'; text: string }>;
}

export interface Adapter {
  name: string;

  hookInstallPath(): string;
  skillInstallPath(): string;

  writeHookConfig(repoRoot: string, hooks: HookSpec[]): Promise<void>;

  readTranscript(hookInput: unknown): Promise<RoleTaggedTranscript>;

  runHeadless<T>(
    promptBody: string,
    stdin: string,
    schema: ZodSchema<T>,
    opts?: HeadlessOpts
  ): Promise<T>;

  renderSkill(spec: SkillSpec): string;
}
