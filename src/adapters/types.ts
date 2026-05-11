import type { ZodSchema } from 'zod';

export type HookEvent = 'Stop' | 'SessionEnd' | 'PreCompact' | 'SessionStart' | 'UserPromptSubmit';

export interface HookSpec {
  event: HookEvent;
  scriptPath: string; // relative to hookInstallPath()
  matcher?: string;
  async?: boolean;
}

export interface SlashCommandSpec {
  name: string;
  description: string;
  body: string;
}

export interface HeadlessOpts {
  timeoutMs?: number;
  allowedTools?: string[];
  logFile?: string;
}

export interface RoleTaggedTranscript {
  user: string[];
  agent: string[];
  interleaved: Array<{ role: 'user' | 'agent'; text: string }>;
}

export interface Adapter {
  name: string;

  hookInstallPath(): string;
  commandInstallPath(): string;

  writeHookConfig(repoRoot: string, hooks: HookSpec[]): Promise<void>;

  readTranscript(hookInput: unknown): Promise<RoleTaggedTranscript>;

  runHeadless<T>(
    promptBody: string,
    stdin: string,
    schema: ZodSchema<T>,
    opts?: HeadlessOpts,
  ): Promise<T>;

  renderSlashCommand(spec: SlashCommandSpec): string;
}
