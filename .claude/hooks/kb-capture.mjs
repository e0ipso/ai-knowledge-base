// src/lib/capture.ts
import { createHash } from "crypto";
import { existsSync as existsSync3, readFileSync } from "fs";

// src/lib/secret-scan.ts
import { existsSync } from "fs";
import { join } from "path";
var FALLBACK_CONFIG = {
  rules: [{ id: "@secretlint/secretlint-rule-preset-recommend" }]
};
function redactSecrets(text, findings) {
  const ordered = [...findings].sort((a, b) => (b.secret?.length ?? 0) - (a.secret?.length ?? 0));
  let out = text;
  for (const f of ordered) {
    const secret = f.secret;
    if (typeof secret !== "string" || secret.length === 0) continue;
    out = out.split(secret).join(`[REDACTED:${f.ruleId}]`);
  }
  return out;
}
async function loadResolvedConfig(cwd) {
  const { loadConfig } = await import("@secretlint/config-loader");
  const explicit = join(cwd, ".secretlintrc.json");
  if (existsSync(explicit)) {
    const loaded2 = await loadConfig({ cwd, configFilePath: explicit });
    if (loaded2.ok) return loaded2.config;
  }
  try {
    const loaded2 = await loadConfig({ cwd });
    if (loaded2.ok) return loaded2.config;
  } catch {
  }
  const { loadPackagesFromConfigDescriptor } = await import("@secretlint/config-loader");
  const loaded = await loadPackagesFromConfigDescriptor({
    configDescriptor: FALLBACK_CONFIG
  });
  return loaded.config;
}
async function scanAndRedact(text, timeoutMs = 1e3) {
  let timer;
  try {
    const cwd = process.cwd();
    const config = await loadResolvedConfig(cwd);
    const { lintSource } = await import("@secretlint/core");
    const linted = await Promise.race([
      lintSource({
        source: {
          filePath: join(cwd, "__transcript__.txt"),
          content: text,
          contentType: "text"
        },
        options: {
          config,
          noPhysicFilePath: true
        }
      }),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`secretlint timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      })
    ]);
    const findings = [];
    for (const m of linted.messages) {
      if (m.type !== "message") continue;
      const [start, end] = m.range;
      if (typeof start !== "number" || typeof end !== "number" || end <= start) continue;
      const secret = text.slice(start, end);
      if (secret.length === 0) continue;
      findings.push({
        ruleId: m.ruleId,
        secret,
        startLine: m.loc?.start?.line,
        endLine: m.loc?.end?.line
      });
    }
    if (findings.length === 0) {
      return { status: "clean", redactedText: text, findings: [] };
    }
    return {
      status: "redacted",
      redactedText: redactSecrets(text, findings),
      findings
    };
  } catch (err) {
    const e = err;
    return {
      status: "blocked",
      redactedText: "",
      findings: [],
      error: e.message
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// src/lib/session-log.ts
import { existsSync as existsSync2, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join as join2 } from "path";
function renderSessionLog(input) {
  const lines = [
    "---",
    "schema_version: 1",
    `session_id: ${yamlString(input.sessionId)}`,
    `captured_by: ${input.capturedBy}`,
    `captured_at: ${yamlString(input.capturedAt)}`,
    `transcript_hash: ${yamlString(input.transcriptHash)}`,
    "proposal_status: pending",
    "proposal_completed_at: null",
    "proposal_error: null",
    "proposal_log: null",
    `secret_scan_status: ${input.secretScanStatus}`,
    "proposals:",
    "  practice: []",
    "  map: []",
    "---",
    "",
    "## Transcript",
    "",
    input.body.trimEnd(),
    "",
    "## Proposal",
    "",
    "(populated by proposal worker)",
    ""
  ];
  return lines.join("\n");
}
function yamlString(value) {
  return JSON.stringify(value);
}
function writeSessionLog(sessionsDir, filename, contents) {
  mkdirSync(sessionsDir, { recursive: true });
  const path = join2(sessionsDir, filename);
  writeFileSync(path, contents);
  return path;
}
function buildSessionLogFilename(capturedAt, sessionId) {
  const d = new Date(capturedAt);
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
  return `${stamp}-${shortSessionId(sessionId)}.md`;
}
function findSessionLogBySessionId(sessionsDir, sessionId) {
  if (!existsSync2(sessionsDir)) return null;
  const suffix = `-${shortSessionId(sessionId)}.md`;
  const matches = readdirSync(sessionsDir).filter((f) => f.endsWith(suffix)).sort();
  return matches[0] ?? null;
}
function shortSessionId(sessionId) {
  return sessionId.replace(/[^a-z0-9]/gi, "").slice(0, 12) || "session";
}
function pad(n) {
  return n.toString().padStart(2, "0");
}

// src/lib/transcript.ts
function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.filter((c) => !!c && typeof c === "object").filter((c) => (c.type ?? "text") === "text").map((c) => typeof c.text === "string" ? c.text : "").filter((s) => s.length > 0).join("\n");
  }
  return "";
}
function parseTranscriptJsonl(text) {
  const out = { interleaved: [] };
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const role = msg.message?.role ?? msg.role ?? msg.type;
    const content = msg.message?.content ?? msg.content;
    if (role === "user") {
      const text2 = extractText(content);
      if (text2) {
        out.interleaved.push({ role: "user", text: text2 });
      }
    } else if (role === "assistant" || role === "agent") {
      const text2 = extractText(content);
      if (text2) {
        out.interleaved.push({ role: "agent", text: text2 });
      }
    }
  }
  return out;
}
function renderRoleTagged(t) {
  return t.interleaved.map((seg) => `[${seg.role === "user" ? "USER" : "AGENT"}]: ${seg.text}`).join("\n\n");
}

// src/lib/capture.ts
var HOOK_EVENT_TO_TRIGGER = {
  Stop: "stop",
  SessionEnd: "session_end",
  PreCompact: "pre_compact"
};
function eventToTrigger(event) {
  if (event && HOOK_EVENT_TO_TRIGGER[event]) {
    return HOOK_EVENT_TO_TRIGGER[event];
  }
  return "stop";
}
async function captureSession(input, ctx) {
  const trigger = eventToTrigger(input.hook_event_name);
  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !existsSync3(transcriptPath)) {
    return {
      status: "no-transcript",
      error: `transcript_path missing or absent: ${transcriptPath ?? "(none)"}`
    };
  }
  const transcriptText = readFileSync(transcriptPath, "utf8");
  const parsed = parseTranscriptJsonl(transcriptText);
  const slice = renderRoleTagged(parsed);
  if (!slice.trim()) {
    return { status: "no-content" };
  }
  const hash = `sha256:${createHash("sha256").update(slice).digest("hex")}`;
  const scan = ctx.scan ?? ((text) => scanAndRedact(text, ctx.scanTimeoutMs ?? 1e3));
  const scanResult = await scan(slice);
  if (scanResult.status === "blocked") {
    return {
      status: "secret-scan-blocked",
      secretScanStatus: "blocked",
      ...scanResult.error !== void 0 ? { error: scanResult.error } : {}
    };
  }
  const capturedAt = (ctx.now?.() ?? /* @__PURE__ */ new Date()).toISOString();
  const sessionId = typeof input.session_id === "string" && input.session_id.length > 0 ? input.session_id : hash.slice(7, 19);
  const existingFilename = findSessionLogBySessionId(ctx.sessionsDir, sessionId);
  const filename = existingFilename ?? buildSessionLogFilename(capturedAt, sessionId);
  const body = renderSessionLog({
    sessionId,
    capturedBy: trigger,
    capturedAt,
    transcriptHash: hash,
    secretScanStatus: scanResult.status,
    body: scanResult.status === "redacted" ? scanResult.redactedText : slice
  });
  const sessionLogPath = writeSessionLog(ctx.sessionsDir, filename, body);
  return {
    status: "written",
    sessionLogPath,
    secretScanStatus: scanResult.status
  };
}

// src/lib/paths.ts
import { existsSync as existsSync4, readFileSync as readFileSync2, statSync } from "fs";
import { dirname, join as join3, resolve } from "path";
import { fileURLToPath } from "url";
function findRepoRoot(from = process.cwd()) {
  let cur = resolve(from);
  while (true) {
    if (existsSync4(join3(cur, ".git")) || existsSync4(join3(cur, ".ai/knowledge-base/.state/installed-version"))) {
      return cur;
    }
    const parent = dirname(cur);
    if (parent === cur) return resolve(from);
    cur = parent;
  }
}
function repoPaths(root) {
  const aiDir = join3(root, ".ai");
  const kbDir = join3(aiDir, "knowledge-base");
  const stateDir = join3(kbDir, ".state");
  const configDir = join3(kbDir, ".config");
  const promptsDir = join3(configDir, "prompts");
  const claudeDir = join3(root, ".claude");
  return {
    root,
    aiDir,
    kbDir,
    stateDir,
    configDir,
    promptsDir,
    installedVersionFile: join3(stateDir, "installed-version"),
    projectConfigFile: join3(kbDir, "config.yaml"),
    sessionsDir: join3(kbDir, "_sessions"),
    logsDir: join3(kbDir, "_logs"),
    nodesDir: join3(kbDir, "nodes"),
    claudeDir,
    claudeCommandsDir: join3(claudeDir, "commands"),
    claudeSkillsDir: join3(claudeDir, "skills"),
    claudeHooksDir: join3(claudeDir, "hooks"),
    claudeSettingsFile: join3(claudeDir, "settings.json"),
    gitignoreFile: join3(root, ".gitignore"),
    secretlintrcFile: join3(root, ".secretlintrc.json"),
    huskyDir: join3(root, ".husky"),
    huskyPreCommitFile: join3(root, ".husky", "pre-commit"),
    packageJsonFile: join3(root, "package.json"),
    lintstagedrcFile: join3(root, ".lintstagedrc.cjs")
  };
}

// src/hooks/kb-capture.ts
var HARD_DEADLINE_MS = 1e3;
var PACKAGE_TAG = "[ai-knowledge-base]";
async function main() {
  if (process.env["KB_BUILDER_INTERNAL"] === "1") return;
  const deadline = setTimeout(() => process.exit(0), HARD_DEADLINE_MS);
  deadline.unref();
  const raw = await readStdin();
  let input = {};
  if (raw.trim().length > 0) {
    try {
      input = JSON.parse(raw);
    } catch {
      return;
    }
  }
  const startCwd = typeof input.cwd === "string" && input.cwd.length > 0 ? input.cwd : process.cwd();
  const root = findRepoRoot(startCwd);
  const paths = repoPaths(root);
  try {
    const result = await captureSession(input, { sessionsDir: paths.sessionsDir });
    if (result.status === "secret-scan-blocked") {
      process.stderr.write(
        `${PACKAGE_TAG} secret scan blocked transcript capture: ${result.error ?? "unknown error"}
`
      );
    }
  } catch (err) {
    process.stderr.write(
      `${PACKAGE_TAG} capture error: ${err instanceof Error ? err.message : String(err)}
`
    );
  }
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
