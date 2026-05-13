// src/hooks/kb-proposal-drain.ts
import { existsSync as existsSync5, readFileSync as readFileSync5 } from "fs";
import { join as join4 } from "path";

// src/lib/headless.ts
import { execa } from "execa";
import { createWriteStream, mkdirSync } from "fs";
import { dirname } from "path";
import "stream";
import split2 from "split2";
var DEFAULT_TIMEOUT_MS = 6e4;
var defaultSpawn = (command, ctx) => {
  const proc = execa(command, ctx.args, {
    input: ctx.stdin,
    env: ctx.env,
    timeout: ctx.timeoutMs,
    stdin: "pipe",
    stdout: "pipe",
    reject: false
  });
  const stdout = proc.stdout;
  const result = proc.then((r) => ({
    exitCode: typeof r.exitCode === "number" ? r.exitCode : void 0,
    failed: r.failed === true,
    timedOut: r.timedOut === true
  }));
  return { stdout, result };
};
async function runHeadlessClaude(promptBody, stdin, schema, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowedTools = opts.allowedTools ?? [];
  const args = [
    "-p",
    promptBody,
    "--allowedTools",
    allowedTools.join(","),
    "--output-format",
    "stream-json",
    "--verbose"
  ];
  if (opts.model) args.push("--model", opts.model);
  if (opts.effort) args.push("--effort", opts.effort);
  const env = {
    ...opts.env ?? process.env,
    KB_BUILDER_INTERNAL: "1"
  };
  const spawn = opts.spawn ?? defaultSpawn;
  let logStream = null;
  if (opts.logFile) {
    mkdirSync(dirname(opts.logFile), { recursive: true });
    logStream = createWriteStream(opts.logFile, { encoding: "utf8", flags: "a" });
  }
  const messages = [];
  const { stdout, result: resultPromise } = spawn("claude", {
    args,
    stdin,
    env,
    timeoutMs
  });
  const splitter = stdout.pipe(split2());
  splitter.on("data", (line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    if (logStream) logStream.write(`${trimmed}
`);
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return;
    }
    messages.push(parsed);
    if (opts.onMessage) opts.onMessage(parsed);
  });
  const streamDone = new Promise((resolve2, reject) => {
    splitter.once("end", () => resolve2());
    splitter.once("error", (err) => reject(err));
  });
  let runResult;
  try {
    const [r] = await Promise.all([resultPromise, streamDone]);
    runResult = r;
  } finally {
    if (logStream) {
      await new Promise((resolve2) => logStream.end(resolve2));
    }
  }
  if (runResult.timedOut) {
    throw new Error(`claude subprocess timed out after ${timeoutMs}ms`);
  }
  if (runResult.failed || runResult.exitCode !== void 0 && runResult.exitCode !== 0) {
    throw new Error(
      `claude subprocess failed (exit code ${String(runResult.exitCode ?? "unknown")})`
    );
  }
  const finalResult = findFinalResult(messages);
  if (finalResult === null) {
    throw new Error("claude subprocess produced no final result message");
  }
  let parsedJson;
  try {
    parsedJson = JSON.parse(finalResult.trim());
  } catch (parseError) {
    throw new Error(
      `curator output was not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. See ${opts.logFile ?? "log"} for the full transcript.`
    );
  }
  const validated = schema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error(`proposal output did not match schema: ${validated.error.message}`);
  }
  return validated.data;
}
function findFinalResult(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m && m.type === "result") {
      if (m.is_error === true) return null;
      if (typeof m.result === "string") return m.result;
    }
  }
  return null;
}

// src/lib/paths.ts
import { existsSync, readFileSync, statSync } from "fs";
import { dirname as dirname2, join, resolve } from "path";
import { fileURLToPath } from "url";
function packageRoot() {
  return resolve(dirname2(fileURLToPath(import.meta.url)), "..");
}
function packageTemplatesDir() {
  return join(packageRoot(), "templates");
}
function findRepoRoot(from = process.cwd()) {
  let cur = resolve(from);
  while (true) {
    if (existsSync(join(cur, ".git")) || existsSync(join(cur, ".ai/knowledge-base/.state/installed-version"))) {
      return cur;
    }
    const parent = dirname2(cur);
    if (parent === cur) return resolve(from);
    cur = parent;
  }
}
function repoPaths(root) {
  const aiDir = join(root, ".ai");
  const kbDir = join(aiDir, "knowledge-base");
  const stateDir = join(kbDir, ".state");
  const configDir = join(kbDir, ".config");
  const promptsDir = join(configDir, "prompts");
  const claudeDir = join(root, ".claude");
  return {
    root,
    aiDir,
    kbDir,
    stateDir,
    configDir,
    promptsDir,
    installedVersionFile: join(stateDir, "installed-version"),
    projectConfigFile: join(kbDir, "config.yaml"),
    sessionsDir: join(kbDir, "_sessions"),
    logsDir: join(kbDir, "_logs"),
    nodesDir: join(kbDir, "nodes"),
    claudeDir,
    claudeCommandsDir: join(claudeDir, "commands"),
    claudeSkillsDir: join(claudeDir, "skills"),
    claudeHooksDir: join(claudeDir, "hooks"),
    claudeSettingsFile: join(claudeDir, "settings.json"),
    gitignoreFile: join(root, ".gitignore"),
    secretlintrcFile: join(root, ".secretlintrc.json"),
    huskyDir: join(root, ".husky"),
    huskyPreCommitFile: join(root, ".husky", "pre-commit"),
    packageJsonFile: join(root, "package.json"),
    lintstagedrcFile: join(root, ".lintstagedrc.cjs")
  };
}

// src/lib/settings.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import { homedir } from "os";
import { join as join2 } from "path";
import yaml from "js-yaml";

// src/lib/schemas.ts
import { z } from "zod";
var CaptureTriggerSchema = z.enum(["stop", "session_end", "pre_compact", "manual"]);
var SecretScanStatusSchema = z.enum(["clean", "redacted", "blocked", "skipped"]);
var ProposalStatusSchema = z.enum(["pending", "done", "failed"]);
var SessionLogFrontmatterSchema = z.object({
  schema_version: z.literal(1),
  session_id: z.string(),
  captured_by: CaptureTriggerSchema,
  captured_at: z.string(),
  transcript_hash: z.string(),
  proposal_status: ProposalStatusSchema,
  proposal_completed_at: z.string().nullable(),
  proposal_error: z.string().nullable(),
  proposal_log: z.string().nullable(),
  secret_scan_status: SecretScanStatusSchema,
  proposals: z.object({
    practice: z.array(z.unknown()),
    map: z.array(z.unknown())
  })
});
var ConfidenceSchema = z.enum(["low", "medium", "high"]);
var ModelFamilySchema = z.enum(["haiku", "sonnet", "opus"]);
var EffortLevelSchema = z.enum(["low", "medium", "high", "xhigh", "max"]);
var ModelChoiceSchema = z.object({ name: ModelFamilySchema, effort: EffortLevelSchema }).strict();
var ProposalCandidateSchema = z.object({
  kind: z.enum(["practice", "map"]),
  tags: z.array(z.string()),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  confidence: ConfidenceSchema,
  supports_existing_node: z.string().nullable(),
  contradicts_existing_node: z.string().nullable()
});
var ProposalOutputSchema = z.object({
  practice: z.array(ProposalCandidateSchema),
  map: z.array(ProposalCandidateSchema)
});
var StateLockSchema = z.object({
  name: z.string(),
  pid: z.number().int(),
  acquired_at: z.string(),
  ttl_ms: z.number().int().positive()
});
var StateFileSchema = z.object({
  schema_version: z.literal(1),
  lock: StateLockSchema.nullable().optional(),
  last_nudged_at: z.string().nullable().optional()
});
var LintStateFileSchema = z.object({
  schema_version: z.literal(1),
  sessions_since_last_lint: z.number().int().nonnegative(),
  last_lint_at: z.string().nullable(),
  last_errors: z.number().int().nonnegative(),
  last_findings: z.number().int().nonnegative()
});
var NodeKindSchema = z.enum(["practice", "map"]);
var NodeFrontmatterSchema = z.object({
  schema_version: z.literal(1),
  id: z.string(),
  title: z.string(),
  kind: NodeKindSchema,
  tags: z.array(z.string()),
  derived_from: z.array(z.string()),
  relates_to: z.array(z.string()),
  confidence: ConfidenceSchema,
  summary: z.string()
});
var CuratorProposedNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: NodeKindSchema,
  tags: z.array(z.string()),
  summary: z.string(),
  body: z.string(),
  confidence: ConfidenceSchema,
  derived_from: z.array(z.string()),
  relates_to: z.array(z.string())
});
var CuratorActionSchema = z.object({
  action: z.enum(["add", "modify", "contradict", "drop"]),
  candidate_origin: z.string(),
  target_node_id: z.string().nullable(),
  proposed_node: CuratorProposedNodeSchema.nullable(),
  rationale: z.string()
});
var CuratorOutputSchema = z.array(CuratorActionSchema);
var IndexFrontmatterSchema = z.object({
  schema_version: z.literal(1),
  nodes_hash: z.string(),
  node_count: z.number().int().nonnegative()
});
var GraphFrontmatterSchema = z.object({
  schema_version: z.literal(1),
  nodes_hash: z.string(),
  node_count: z.number().int().nonnegative()
});
var BootstrapCandidateSchema = z.object({
  kind: z.enum(["practice", "map"]),
  tags: z.array(z.string()),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  confidence: ConfidenceSchema,
  derived_from: z.array(z.string()),
  supports_existing_node: z.string().nullable(),
  contradicts_existing_node: z.string().nullable()
});
var BootstrapOutputSchema = z.object({
  practice: z.array(BootstrapCandidateSchema),
  map: z.array(BootstrapCandidateSchema)
});
var BootstrapDocEntrySchema = z.object({
  content_sha256: z.string(),
  last_processed_at: z.string(),
  produced_nodes: z.array(z.string())
});
var ConflictReportSchema = z.object({
  id: z.string(),
  detected_at: z.string(),
  run_id: z.string(),
  candidate_origin: z.string(),
  target_node_id: z.string().nullable(),
  rationale: z.string(),
  proposed_node: CuratorProposedNodeSchema.nullable()
});
var PendingConflictsFileSchema = z.object({
  schema_version: z.literal(1),
  conflicts: z.array(ConflictReportSchema)
});
var FailureReportSchema = z.object({
  reason: z.enum(["add_collision", "modify_missing_target"]),
  candidate_origin: z.string(),
  node_id: z.string(),
  detail: z.string()
});
var SettingsSchema = z.object({
  schema_version: z.literal(1),
  drainBound: z.number().int().positive().optional(),
  proposalTimeout: z.number().int().positive().optional(),
  lockTtlMs: z.number().int().positive().optional(),
  curationThreshold: z.number().int().positive().optional(),
  bootstrapTokenBudget: z.number().int().positive().optional(),
  logsRetentionDays: z.number().int().positive().optional(),
  lintEveryNSessions: z.number().int().positive().optional(),
  proposalModel: ModelChoiceSchema.optional(),
  curatorModel: ModelChoiceSchema.optional(),
  bootstrapModel: ModelChoiceSchema.optional()
}).strict();
var BootstrapStateSchema = z.object({
  schema_version: z.literal(1),
  last_full_bootstrap_at: z.string().nullable().optional(),
  last_incremental_at: z.string().nullable().optional(),
  docs: z.record(BootstrapDocEntrySchema)
});

// src/lib/settings.ts
var SETTINGS_DEFAULTS = {
  drainBound: 5,
  proposalTimeout: 6e4,
  lockTtlMs: 30 * 60 * 1e3,
  curationThreshold: 5,
  bootstrapTokenBudget: 1e4,
  logsRetentionDays: 30,
  lintEveryNSessions: 50
};
var MODEL_CHOICE_KEYS = ["proposalModel", "curatorModel", "bootstrapModel"];
function resolveSettings(opts = {}) {
  const projectFile = opts.projectFile ?? null;
  const userFile = opts.userFile ?? defaultUserConfigPath();
  const warnings = [];
  const user = loadFile(userFile, warnings);
  const project = projectFile ? loadFile(projectFile, warnings) : null;
  const effective = { ...SETTINGS_DEFAULTS };
  applyOverrides(effective, user);
  applyOverrides(effective, project);
  return {
    settings: effective,
    projectFile: projectFile ?? null,
    userFile: existsSync2(userFile) ? userFile : null,
    warnings
  };
}
function applyOverrides(target, src) {
  if (!src) return;
  for (const key of Object.keys(SETTINGS_DEFAULTS)) {
    const value = src[key];
    if (value !== void 0) {
      target[key] = value;
    }
  }
  for (const key of MODEL_CHOICE_KEYS) {
    const value = src[key];
    if (value !== void 0) target[key] = value;
  }
}
function loadFile(file, warnings) {
  if (!existsSync2(file)) return null;
  let raw;
  try {
    raw = readFileSync2(file, "utf8");
  } catch (err) {
    warnings.push(`settings file unreadable (${file}): ${err.message}`);
    return null;
  }
  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    warnings.push(`settings file is not valid YAML (${file}): ${err.message}`);
    return null;
  }
  const result = SettingsSchema.safeParse(parsed);
  if (!result.success) {
    warnings.push(`settings file failed schema validation (${file}): ${result.error.message}`);
    return null;
  }
  return result.data;
}
function defaultUserConfigPath(env = process.env) {
  const xdg = env["XDG_CONFIG_HOME"];
  const base = xdg && xdg.length > 0 ? xdg : join2(homedir(), ".config");
  return join2(base, "ai-knowledge-base", "config.yaml");
}

// src/lib/proposal-drain.ts
import matter from "gray-matter";
import { existsSync as existsSync4, readFileSync as readFileSync4, readdirSync, writeFileSync as writeFileSync2 } from "fs";
import { join as join3 } from "path";

// src/lib/state.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync3, renameSync, writeFileSync } from "fs";
import { dirname as dirname3 } from "path";
var DEFAULT_LOCK_TTL_MS = 30 * 60 * 1e3;
function readState(file) {
  if (!existsSync3(file)) return { schema_version: 1 };
  try {
    const raw = JSON.parse(readFileSync3(file, "utf8"));
    const parsed = StateFileSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    return { schema_version: 1 };
  } catch {
    return { schema_version: 1 };
  }
}
function writeState(file, state) {
  mkdirSync2(dirname3(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}
`);
  renameSync(tmp, file);
}
function acquireLock(file, opts) {
  const state = readState(file);
  const existing = state.lock ?? null;
  const ttlMs = opts.ttlMs ?? DEFAULT_LOCK_TTL_MS;
  const nowMs = opts.now.getTime();
  if (existing) {
    const acquiredMs = Date.parse(existing.acquired_at);
    const age = Number.isFinite(acquiredMs) ? nowMs - acquiredMs : Number.POSITIVE_INFINITY;
    const expired = age > existing.ttl_ms;
    if (!expired && existing.pid !== opts.pid) {
      return false;
    }
  }
  const lock = {
    name: opts.name,
    pid: opts.pid,
    acquired_at: opts.now.toISOString(),
    ttl_ms: ttlMs
  };
  writeState(file, { ...state, lock });
  return true;
}
function releaseLock(file, name, pid) {
  const state = readState(file);
  if (!state.lock) return;
  if (state.lock.name !== name || state.lock.pid !== pid) return;
  const next = { ...state, lock: null };
  writeState(file, next);
}

// src/lib/proposal-drain.ts
var DEFAULT_MAX_ENTRIES = 5;
var DEFAULT_TIMEOUT_MS2 = 6e4;
var PROPOSAL_LOCK_NAME = "proposal-drain";
var MAX_PROPOSAL_ERROR_LEN = 500;
var TRANSCRIPT_PLACEHOLDER = "[TRANSCRIPT PLACEHOLDER - substituted at runtime]";
async function drainProposalQueue(ctx) {
  const now = ctx.now ?? (() => /* @__PURE__ */ new Date());
  const maxEntries = ctx.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const timeoutMs = ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS2;
  const pid = ctx.pid ?? process.pid;
  const lockHeld = acquireLock(ctx.stateFile, {
    name: PROPOSAL_LOCK_NAME,
    pid,
    now: now(),
    ...ctx.lockTtlMs !== void 0 ? { ttlMs: ctx.lockTtlMs } : {}
  });
  if (!lockHeld) {
    return { status: "locked", processed: [], remaining: countPending(ctx.sessionsDir) };
  }
  const processed = [];
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
        ...ctx.model !== void 0 ? { model: ctx.model } : {},
        ...ctx.effort !== void 0 ? { effort: ctx.effort } : {}
      });
      processed.push(result);
    }
  } finally {
    releaseLock(ctx.stateFile, PROPOSAL_LOCK_NAME, pid);
  }
  const remaining = countPending(ctx.sessionsDir);
  return { status: "completed", processed, remaining };
}
function listPending(sessionsDir) {
  if (!existsSync4(sessionsDir)) return [];
  const names = readdirSync(sessionsDir).filter((name) => name.endsWith(".md") && !name.startsWith(".")).sort();
  const out = [];
  for (const name of names) {
    const file = join3(sessionsDir, name);
    const data = readFrontmatter(file);
    if (!data) continue;
    if (data["proposal_status"] !== "pending") continue;
    const sessionId = typeof data["session_id"] === "string" ? data["session_id"] : name;
    out.push({ sessionId, file });
  }
  return out;
}
function countPending(sessionsDir) {
  return listPending(sessionsDir).length;
}
function readFrontmatter(file) {
  try {
    const parsed = matter(readFileSync4(file, "utf8"));
    return parsed.data;
  } catch {
    return null;
  }
}
async function processSessionLog(args) {
  const { entry, sessionsDir, logsDir, promptTemplate, runner, now, timeoutMs, model, effort } = args;
  const parsed = matter(readFileSync4(entry.file, "utf8"));
  const transcript = extractTranscript(parsed.content);
  const prompt = buildProposalPrompt(promptTemplate, transcript);
  const startedAt = now();
  const logFile = proposalLogPath(logsDir, entry.sessionId, startedAt);
  try {
    const out = await runner(prompt, "", ProposalOutputSchema, {
      timeoutMs,
      allowedTools: [],
      logFile,
      ...model !== void 0 ? { model } : {},
      ...effort !== void 0 ? { effort } : {}
    });
    writeSessionLogFrontmatter(entry.file, parsed, {
      proposal_status: "done",
      proposal_completed_at: now().toISOString(),
      proposal_error: null,
      proposal_log: relativeLogPath(sessionsDir, logFile),
      proposals: { practice: out.practice, map: out.map }
    });
    return { sessionId: entry.sessionId, status: "done", logFile };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const truncated = message.length > MAX_PROPOSAL_ERROR_LEN ? `${message.slice(0, MAX_PROPOSAL_ERROR_LEN)}...` : message;
    writeSessionLogFrontmatter(entry.file, parsed, {
      proposal_status: "failed",
      proposal_completed_at: now().toISOString(),
      proposal_error: truncated,
      proposal_log: relativeLogPath(sessionsDir, logFile)
    });
    return { sessionId: entry.sessionId, status: "failed", error: truncated, logFile };
  }
}
function extractTranscript(body) {
  const startMatch = body.match(/## Transcript\s*\n+/);
  if (!startMatch || startMatch.index === void 0) return body.trim();
  const start = startMatch.index + startMatch[0].length;
  const rest = body.slice(start);
  const endMatch = rest.match(/\n## Proposal/);
  if (!endMatch) return rest.trim();
  return rest.slice(0, endMatch.index).trim();
}
function buildProposalPrompt(template, transcript) {
  if (!template.includes(TRANSCRIPT_PLACEHOLDER)) {
    throw new Error(
      `proposal-extract prompt is missing the ${TRANSCRIPT_PLACEHOLDER} placeholder; the prompt template must contain it verbatim`
    );
  }
  return template.replace(TRANSCRIPT_PLACEHOLDER, transcript);
}
function proposalLogPath(logsDir, sessionId, when) {
  const stamp = isoToCompactStamp(when);
  const safe = sessionId.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "session";
  return join3(logsDir, "proposal", `${safe}__${stamp}.jsonl`);
}
function isoToCompactStamp(d) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function relativeLogPath(sessionsDir, logFile) {
  const kbRoot = join3(sessionsDir, "..");
  const rel = logFile.startsWith(kbRoot) ? logFile.slice(kbRoot.length).replace(/^[\\/]/, "") : logFile;
  return rel;
}
function writeSessionLogFrontmatter(file, parsed, patch) {
  const data = { ...parsed.data };
  data["proposal_status"] = patch.proposal_status;
  data["proposal_completed_at"] = patch.proposal_completed_at;
  data["proposal_error"] = patch.proposal_error;
  data["proposal_log"] = patch.proposal_log;
  if (patch.proposals) data["proposals"] = patch.proposals;
  const body = updateProposalBody(parsed.content, patch);
  const serialized = matter.stringify(body, data);
  writeFileSync2(file, serialized);
}
function updateProposalBody(content, patch) {
  if (patch.proposal_status !== "done") return content;
  return content.replace(
    /\(populated by proposal worker\)/,
    `_Extraction complete; see proposals in frontmatter._`
  );
}

// src/hooks/kb-proposal-drain.ts
var PACKAGE_TAG = "[ai-knowledge-base]";
async function main() {
  if (process.env["KB_BUILDER_INTERNAL"] === "1") return;
  const raw = await readStdin();
  let input = {};
  if (raw.trim().length > 0) {
    try {
      input = JSON.parse(raw);
    } catch {
      input = {};
    }
  }
  const startCwd = typeof input.cwd === "string" && input.cwd.length > 0 ? input.cwd : process.cwd();
  const root = findRepoRoot(startCwd);
  const paths = repoPaths(root);
  if (!existsSync5(paths.installedVersionFile)) return;
  const promptTemplate = loadProposalPrompt(paths.promptsDir);
  if (!promptTemplate) {
    process.stderr.write(`${PACKAGE_TAG} proposal prompt template not found; skipping drain
`);
    return;
  }
  const runner = async (prompt, stdin, schema, opts) => runHeadlessClaude(prompt, stdin, schema, opts);
  try {
    const { settings } = resolveSettings({ projectFile: paths.projectConfigFile });
    const summary = await drainProposalQueue({
      sessionsDir: paths.sessionsDir,
      logsDir: paths.logsDir,
      stateFile: join4(paths.stateDir, "state.json"),
      promptTemplate,
      runner,
      maxEntries: settings.drainBound,
      timeoutMs: settings.proposalTimeout,
      lockTtlMs: settings.lockTtlMs,
      ...settings.proposalModel ? { model: settings.proposalModel.name, effort: settings.proposalModel.effort } : {}
    });
    if (summary.status === "locked") {
      return;
    }
    const failed = summary.processed.filter((p) => p.status === "failed");
    if (failed.length > 0) {
      process.stderr.write(
        `${PACKAGE_TAG} proposal drain: ${failed.length} session(s) failed; see _logs/proposal/
`
      );
    }
  } catch (err) {
    process.stderr.write(
      `${PACKAGE_TAG} proposal drain error: ${err instanceof Error ? err.message : String(err)}
`
    );
  }
}
function loadProposalPrompt(promptsDir) {
  const override = join4(promptsDir, "proposal-extract.md");
  if (existsSync5(override)) return readFileSync5(override, "utf8");
  const bundled = join4(packageTemplatesDir(), "prompts/proposal-extract.md");
  if (existsSync5(bundled)) return readFileSync5(bundled, "utf8");
  return null;
}
function readStdin() {
  return new Promise((resolve2) => {
    if (process.stdin.isTTY) {
      resolve2("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve2(data));
    process.stdin.on("error", () => resolve2(""));
  });
}
void main().catch(() => process.exit(0));
