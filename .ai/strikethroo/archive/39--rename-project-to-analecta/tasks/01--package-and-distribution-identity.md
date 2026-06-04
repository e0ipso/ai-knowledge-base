---
id: 1
group: "package-identity"
dependencies: []
status: "completed"
created: 2026-06-03
skills:
  - npm-packaging
---
# Package & distribution identity

## Objective
Establish `analecta` as the published npm artifact: update `package.json`
identity fields and any release/CI configuration so installation, execution,
and provenance all use the new unscoped name.

## Skills Required
- **npm-packaging**: editing `package.json` (name/bin/repository/publishConfig),
  understanding unscoped publish + provenance constraints, auditing release CI.

## Acceptance Criteria
- [ ] `package.json` `name` is `"analecta"` (scope `@e0ipso/` dropped).
- [ ] `bin` map has a single key `analecta` pointing at `./dist/cli.js`.
- [ ] `repository.url`, `homepage`, and `bugs.url` reference `e0ipso/analecta`.
- [ ] `publishConfig` keeps `{ "access": "public", "provenance": true }`.
- [ ] `keywords` and `description` reflect the `analecta` brand while retaining discoverable terms (knowledge base, AI, etc.).
- [ ] Any release/CI config that keys on `ai-knowledge-base` or `@e0ipso/ai-knowledge-base` is updated.
- [ ] `node -e "console.log(require('./package.json').name, Object.keys(require('./package.json').bin))"` prints `analecta [ 'analecta' ]`.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
Edit `package.json` at the repo root. Audit `.github/workflows/` and any
release tooling (e.g. semantic-release / release config files) for references
to the old package name. Do **not** add compatibility aliases — this is a
clean break.

## Input Dependencies
None. This is a zero-dependency Phase 1 task.

## Output Artifacts
- Updated `package.json` with `analecta` identity.
- Updated CI/release configuration referencing the new package name.

## Implementation Notes
The npm-package deprecation of `@e0ipso/ai-knowledge-base` and the GitHub repo
rename are **release-time follow-ups**, not part of this task. Provenance will
only validate once the repo is renamed; do not attempt to publish here.

<details>
<summary>Step-by-step</summary>

1. Open `package.json`.
2. Set `"name": "analecta"` (remove the `@e0ipso/` scope entirely).
3. In `"bin"`, replace the existing key with `"analecta": "./dist/cli.js"`
   (verify the target path matches the current build output; keep the target,
   change only the key).
4. Update `"repository"` (`url` → `git+https://github.com/e0ipso/analecta.git`
   or the repo's existing URL shape), `"homepage"`
   (→ `https://mateuaguilo.com/analecta` or the GitHub pages URL the repo uses),
   and `"bugs"` (`url` → `https://github.com/e0ipso/analecta/issues`). Match the
   exact URL shape already present, only swapping the repo slug.
5. Leave `"publishConfig": { "access": "public", "provenance": true }` intact —
   `access: public` is still required for an unscoped publish.
6. Update `"description"` to name `analecta`; review `"keywords"` and adjust
   brand terms while keeping discovery terms.
7. `grep -rIn -e 'ai-knowledge-base' -e '@e0ipso/ai-knowledge-base' .github`
   and any release config files; update matches that select/publish the package.
8. Verify: `node -e "console.log(require('./package.json').name, Object.keys(require('./package.json').bin))"`
   must print `analecta [ 'analecta' ]`.
</details>
