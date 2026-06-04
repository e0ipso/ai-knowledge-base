---
id: 2
group: "command-surface"
dependencies: []
status: "completed"
created: 2026-06-03
skills:
  - typescript
  - git
---
# Rename slash skills, CLI program name, and LauncherSkill type

## Objective
Rename the three user-invoked slash skills (`kb-bootstrap`/`kb-curate`/`kb-add`
→ `ana-bootstrap`/`ana-curate`/`ana-add`), change the CLI program name to
`analecta`, and update the `LauncherSkill` type union that tracks them.

## Skills Required
- **typescript**: edit `src/cli.ts` and `src/lib/launch-skill.ts` (union type + doc comments).
- **git**: `git mv` the skill source directories to preserve history.

## Acceptance Criteria
- [ ] `src/templates-source/skills/kb-bootstrap|kb-curate|kb-add` are renamed (via `git mv`) to `ana-bootstrap|ana-curate|ana-add`.
- [ ] Each renamed `SKILL.md`'s frontmatter `name:` and any `/kb-*` references in its description/body are updated to `ana-*`.
- [ ] `src/cli.ts` calls `.name('analecta')` (was `'ai-knowledge-base'`); subcommands (`init`, `doctor`, `curate`, `bootstrap`, …) are unchanged.
- [ ] `src/lib/launch-skill.ts` `LauncherSkill` union is `'ana-bootstrap' | 'ana-curate' | 'ana-add'`, and `/kb-…` references in its doc comment are updated.
- [ ] `npm run typecheck` passes for the touched files (no dangling `kb-*` skill identifiers).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
Skill sources live at `src/templates-source/skills/`. The launcher type and the
CLI program name are the code that references those skill names. Subcommand
names must NOT change — only the program (`bin`) name and the slash-skill names.

## Input Dependencies
None. Zero-dependency Phase 1 task.

## Output Artifacts
- Renamed `ana-*` skill source directories with updated `SKILL.md`.
- `src/cli.ts` with `.name('analecta')`.
- `src/lib/launch-skill.ts` with the `ana-*` union.

These feed the regeneration task (templates/ + dogfood installs) and the
verification task.

## Implementation Notes
<details>
<summary>Step-by-step</summary>

1. Rename the three skill directories preserving history:
   - `git mv src/templates-source/skills/kb-bootstrap src/templates-source/skills/ana-bootstrap`
   - `git mv src/templates-source/skills/kb-curate src/templates-source/skills/ana-curate`
   - `git mv src/templates-source/skills/kb-add src/templates-source/skills/ana-add`
2. In each renamed directory's `SKILL.md`, update the frontmatter `name:`
   (e.g. `name: ana-bootstrap`) and rewrite any `/kb-bootstrap`, `/kb-curate`,
   `/kb-add` mentions in the description and body to `/ana-*`.
3. Edit `src/cli.ts`: find `.name('ai-knowledge-base')` and change to
   `.name('analecta')`. Leave every `.command('…')`/subcommand string intact.
4. Edit `src/lib/launch-skill.ts`: change the `LauncherSkill` union from
   `'kb-bootstrap' | 'kb-curate' | 'kb-add'` to
   `'ana-bootstrap' | 'ana-curate' | 'ana-add'`, and update the `/kb-…`
   references inside the file's doc comment.
5. Search for any other code that references the old skill names:
   `grep -rIn -e 'kb-bootstrap' -e 'kb-curate' -e 'kb-add' src` and update
   functional references (leave the dogfood KB under `.ai/` for its own task).
6. Run `npm run typecheck` and confirm no errors from these files.
</details>
