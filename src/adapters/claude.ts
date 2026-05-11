import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  Adapter,
  HeadlessOpts,
  HookSpec,
  RoleTaggedTranscript,
  SlashCommandSpec,
} from './types.js';

interface ClaudeSettings {
  hooks?: Record<
    string,
    Array<{ matcher?: string; hooks: Array<{ type: string; command: string; async?: boolean }> }>
  >;
  [key: string]: unknown;
}

export class ClaudeAdapter implements Adapter {
  readonly name = 'claude';

  hookInstallPath(): string {
    return '.claude/hooks';
  }

  commandInstallPath(): string {
    return '.claude/commands';
  }

  /**
   * Merges hook entries into `.claude/settings.json`. Existing user-defined
   * hooks are preserved; entries previously written by us are recognized by
   * the `KB_BUILDER_HOOK` marker in the command string and replaced wholesale.
   */
  async writeHookConfig(repoRoot: string, hooks: HookSpec[]): Promise<void> {
    const settingsFile = join(repoRoot, '.claude/settings.json');
    let settings: ClaudeSettings = {};
    if (existsSync(settingsFile)) {
      try {
        settings = JSON.parse(readFileSync(settingsFile, 'utf8')) as ClaudeSettings;
      } catch (err) {
        throw new Error(`Could not parse existing ${settingsFile}: ${(err as Error).message}`);
      }
    }
    settings.hooks ??= {};

    // Strip any entries we previously wrote.
    for (const [event, entries] of Object.entries(settings.hooks)) {
      const filtered = entries
        .map((entry) => ({
          ...entry,
          hooks: entry.hooks.filter((h) => !h.command.includes('KB_BUILDER_HOOK')),
        }))
        .filter((entry) => entry.hooks.length > 0);
      if (filtered.length === 0) delete settings.hooks[event];
      else settings.hooks[event] = filtered;
    }

    for (const hook of hooks) {
      const entryList = (settings.hooks[hook.event] ??= []);
      const command = `KB_BUILDER_HOOK=${hook.event} node ${hook.scriptPath}`;
      const entry: {
        matcher?: string;
        hooks: Array<{ type: string; command: string; async?: boolean }>;
      } = {
        hooks: [{ type: 'command', command, ...(hook.async ? { async: true } : {}) }],
      };
      if (hook.matcher) entry.matcher = hook.matcher;
      entryList.push(entry);
    }

    mkdirSync(dirname(settingsFile), { recursive: true });
    writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`);
  }

  async readTranscript(_hookInput: unknown): Promise<RoleTaggedTranscript> {
    throw new Error('readTranscript() is implemented in M1');
  }

  async runHeadless<T>(
    _promptBody: string,
    _stdin: string,
    _schema: import('zod').ZodSchema<T>,
    _opts?: HeadlessOpts,
  ): Promise<T> {
    throw new Error('runHeadless() is implemented in M2');
  }

  renderSlashCommand(spec: SlashCommandSpec): string {
    // Claude Code slash command files are plain markdown with optional frontmatter.
    return `---\ndescription: ${JSON.stringify(spec.description)}\n---\n\n${spec.body.trim()}\n`;
  }
}
