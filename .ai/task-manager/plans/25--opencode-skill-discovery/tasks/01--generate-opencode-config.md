---
id: 1
group: "opencode-installer"
dependencies: []
status: "pending"
created: "2026-05-19"
skills: ["typescript", "node-js"]
---
# Generate `.opencode/opencode.json` with skill path registration

## Objective
Extend the OpenCode installer (`src/harnesses/opencode/install.ts`) so that after copying shared skills into `.opencode/skills/`, it creates or merges `.opencode/opencode.json` to register `.opencode/skills` in `skills.paths`. This makes OpenCode's runtime discover the skills it installs, since OpenCode does not auto-scan `.opencode/skills/` by default.

## Skills Required
- `typescript`: Type-safe Node.js file I/O and JSON manipulation
- `node-js`: `fs` module operations (read, write, exist checks)

## Acceptance Criteria
- [ ] `installOpenCode()` writes `.opencode/opencode.json` with `"skills": { "paths": [".opencode/skills"] }` when the file does not exist.
- [ ] If `.opencode/opencode.json` already exists, the installer merges the `skills.paths` array without overwriting unrelated keys (model, provider, plugin, etc.).
- [ ] The merge deduplicates `skills.paths`; repeated installs do not produce duplicate entries.
- [ ] If `.opencode/opencode.jsonc` exists, the installer skips writing `.opencode/opencode.json` entirely (to avoid comment loss / ambiguity).
- [ ] An inline comment is added near the new logic explaining why the config file is created (OpenCode's default discovery only scans `.claude/skills/` and `.agents/skills/`).

## Technical Requirements
- Use synchronous `fs` APIs (`readFileSync`, `writeFileSync`, `existsSync`) to match the existing installer style.
- The merge is shallow: read existing JSON, ensure `skills.paths` contains `.opencode/skills`, write back.
- Deduplication should be case-sensitive and exact string match.
- The config path is `join(paths.dir, 'opencode.json')` and the jsonc path is `join(paths.dir, 'opencode.jsonc')`.

## Input Dependencies
None.

## Output Artifacts
- Modified `src/harnesses/opencode/install.ts`
- `.opencode/opencode.json` file generated at install time

## Implementation Notes
<details>
OpenCode's skill discovery hard-codes `.claude` and `.agents` in its default search paths. It also reads `skills.paths` from the resolved config. By placing `.opencode/opencode.json` inside the harness directory, OpenCode's config resolver (which walks up from CWD looking for `.opencode/opencode.json` / `.opencode/opencode.jsonc`) will find it and include `.opencode/skills/` in the skill search.

The existing `installOpenCode()` function ends with `installSharedSkills(opts.templatesDir, paths.skillsDir);`. After this line, add logic roughly like:

1. `const configPath = join(paths.dir, 'opencode.json');`
2. `const configPathC = join(paths.dir, 'opencode.jsonc');`
3. If `existsSync(configPathC)`, return early (skip).
4. If `existsSync(configPath)`, read and parse it. Otherwise start with `{}`.
5. Ensure the parsed object has `skills = { ...(existing.skills || {}), paths: [...(existing.skills?.paths || [])] }`.
6. If `.opencode/skills` is not in `skills.paths`, push it.
7. Write `JSON.stringify({ ...existing, skills }, null, 2) + '\n'` back to `configPath`.

Add a JSDoc or inline comment citing that OpenCode does not scan `.opencode/skills/` by default, so the config file is required for discovery.
</details>
