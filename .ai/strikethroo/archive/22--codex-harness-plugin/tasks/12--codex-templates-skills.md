---
id: 12
group: "codex-adapter"
dependencies: [7]
status: "completed"
created: 2026-05-15
skills:
  - typescript
---

# Codex skill templates and `.agents/skills/` install layout

## Objective

Author `src/templates-source/codex/skills/kb-{add,bootstrap,curate}/SKILL.md` with Codex-flavored frontmatter (just `name` + `description`, no `allowed-tools`), with every `npx @e0ipso/ai-knowledge-base ...` invocation in the body containing the `--harness codex` flag. Confirm the `install()` step from Task 7 copies them into `.agents/skills/` in the consumer repo.

## Skills Required

- typescript (build wiring; SKILL.md is markdown but produced via the package template tree)

## Acceptance Criteria

- [ ] Three SKILL.md files exist:
  - `src/templates-source/codex/skills/kb-add/SKILL.md`
  - `src/templates-source/codex/skills/kb-bootstrap/SKILL.md`
  - `src/templates-source/codex/skills/kb-curate/SKILL.md`
- [ ] Each file's frontmatter is exactly two keys (`name`, `description`) — no `allowed-tools`
- [ ] Every `npx @e0ipso/ai-knowledge-base ...` invocation in the body includes `--harness codex` (per `project_cli_invocation_npx_scoped` and the explicit-harness-flag rule)
- [ ] Prose mirrors the Claude versions' content (same task, same instructions, same tone) — adapted only where Codex-specific behavior differs (no `Bash(...)` tool restrictions in prose; rely on Codex's sandbox+approval flow)
- [ ] The Codex adapter's `install()` (Task 7) copies the entire `templates/codex/skills/` tree into `.agents/skills/` in the consumer repo
- [ ] After running `init --harnesses codex` in a temp repo, `.agents/skills/kb-{add,bootstrap,curate}/SKILL.md` exist and parse as valid markdown with the expected frontmatter

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- File-tree authoring under `src/templates-source/codex/skills/`
- The packaging step (`npm pack` / `tsup`) must include this directory in the published tarball — verify `files:` in `package.json` covers `src/templates-source/**` or `templates/**` as appropriate (mirror however Claude skills are shipped today)

## Input Dependencies

- Task 7 (Codex adapter scaffold, which provides the `install()` that copies these files)

## Output Artifacts

- Three Codex SKILL.md files
- Build/packaging adjustments (if needed) to include `templates/codex/skills/` in the published package

## Implementation Notes

<details>
<summary>Guidance</summary>

- Codex SKILL.md frontmatter (from Codex official docs):
  ```yaml
  ---
  name: kb-curate
  description: Curate pending session logs into knowledge-base nodes by running the `npx @e0ipso/ai-knowledge-base curate --harness codex` CLI, then resolve any contradictions surfaced by the curator. Use when the user wants to process accumulated session captures.
  ---
  ```
- Body: same prose as the Claude version, but replace any `Bash(npx ...)` allowlist references with plain prose ("run the following command"). Codex skill bodies do not declare tool restrictions; the Codex sandbox / approval policy is the security layer.
- Where the Claude SKILL.md says "use the Read tool to inspect ...", the Codex SKILL.md says the same — Codex's tool vocabulary overlaps enough that prose carries over.
- Copy command at install time: simple recursive copy of `templates/codex/skills/` into `paths.skillsDir` (which Task 1 sets to `.agents/skills/` for Codex).
- `package.json` `files:` array: verify it already globs `templates/**` (so the Claude templates ship). Adding `templates/codex/**` should be implicit if so. If `files:` enumerates specific subdirs, add `templates/codex/**`.

</details>
