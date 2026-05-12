---
id: 1
group: "infrastructure"
dependencies: []
status: "pending"
created: 2026-05-12
skills:
  - typescript
---
# Add model/effort schema fields and headless runner seam

## Objective
Introduce two zod enums (`ModelFamily`, `EffortLevel`) and three optional `{ name, effort }` object fields (`stage2Model`, `curatorModel`, `bootstrapModel`) on `SettingsSchema`, then plumb optional `model` and `effort` parameters through `runHeadlessClaude()` and the adapter interface so any caller can append `--model <value>` and `--effort <value>` to the spawned `claude -p` command.

## Skills Required
- typescript (zod schema authoring, type plumbing)

## Acceptance Criteria
- [ ] `src/lib/schemas.ts` exports `ModelFamily` (zod enum: `haiku`, `sonnet`, `opus`) and `EffortLevel` (zod enum: `low`, `medium`, `high`, `xhigh`, `max`).
- [ ] `SettingsSchema` gains three top-level optional fields: `stage2Model`, `curatorModel`, `bootstrapModel`. Each value is a `.strict()` object `{ name: ModelFamily, effort: EffortLevel }` with both keys required when the object is present.
- [ ] `SettingsSchema` remains `.strict()` at the top level. `SETTINGS_DEFAULTS` is not changed (the three new keys stay unset by default).
- [ ] The doc-comment above `SettingsSchema` lists the three new keys and their `name`/`effort` sub-keys with accepted values.
- [ ] `RunHeadlessOptions` in `src/lib/headless.ts` accepts optional `model?: ModelFamily` and `effort?: EffortLevel` (or equivalent string union; reuse the inferred types from the zod enums to avoid drift).
- [ ] `runHeadlessClaude()` appends `--model <value>` only when `options.model` is set, and `--effort <value>` only when `options.effort` is set. When unset, no flag is appended (today's behavior is preserved exactly).
- [ ] The Adapter interface in `src/adapters/types.ts` threads `model` and `effort` through whatever method currently invokes `runHeadlessClaude()`; `src/adapters/claude.ts` passes both through unchanged.
- [ ] `npm run typecheck` passes.

## Technical Requirements
- Zod version already pinned in `package.json`; do not bump.
- Use `z.enum([...] as const).optional()` for the inner objects so the inferred TypeScript types stay accurate.
- The inner `{ name, effort }` object must be `.strict()` so that typos in sub-keys fail at load time.
- Do not introduce a CLI flag, an env var, or any caller-facing API beyond the optional `RunHeadlessOptions` fields. The seam is purely additive.
- No schema-version bump and no migrator (project policy: clean break, no legacy paths).

## Input Dependencies
None.

## Output Artifacts
- Updated `src/lib/schemas.ts` with new enums, fields, and doc-comment.
- Updated `src/lib/headless.ts` with new options and args construction.
- Updated `src/adapters/types.ts` and `src/adapters/claude.ts` threading the new fields.
- Exported `ModelFamily` and `EffortLevel` types reusable by callers in Task 2.

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. In `src/lib/schemas.ts`:
   - Define `export const ModelFamilySchema = z.enum(['haiku', 'sonnet', 'opus']);` and `export type ModelFamily = z.infer<typeof ModelFamilySchema>;`.
   - Define `export const EffortLevelSchema = z.enum(['low', 'medium', 'high', 'xhigh', 'max']);` and `export type EffortLevel = z.infer<typeof EffortLevelSchema>;`.
   - Define a reusable inner shape: `const ModelChoiceSchema = z.object({ name: ModelFamilySchema, effort: EffortLevelSchema }).strict();`.
   - Extend `SettingsSchema` (look for the existing `z.object({ ... }).strict()` definition) with three optional fields: `stage2Model: ModelChoiceSchema.optional()`, `curatorModel: ModelChoiceSchema.optional()`, `bootstrapModel: ModelChoiceSchema.optional()`.
   - Update the doc-comment that precedes `SettingsSchema`. List each new key in the same style as the existing keys, naming accepted `name` values (`haiku`, `sonnet`, `opus`) and `effort` values (`low`, `medium`, `high`, `xhigh`, `max`), and note that unset means "no flag passed".
   - Do not modify `SETTINGS_DEFAULTS`.
2. In `src/lib/headless.ts`:
   - Import `ModelFamily` and `EffortLevel` from `./schemas`.
   - Extend the `RunHeadlessOptions` type (likely an interface or type alias) with `model?: ModelFamily;` and `effort?: EffortLevel;`.
   - Locate the block that builds the `args: string[]` array for the `claude -p` invocation. After the existing args are pushed, conditionally push `--model` and the value, then `--effort` and the value. Use plain `if (options.model) args.push('--model', options.model);` and the analogous block for `effort`. Do not interpolate them into a single string.
   - Do not touch the spawn function signature, log-file handling, recursion guard (`KB_BUILDER_INTERNAL`), or schema validation logic.
3. In `src/adapters/types.ts`:
   - Find the method on the Adapter interface that the three subprocess callers use to invoke `claude -p` (likely named something like `runHeadless` or `runClaudeHeadless`). Add `model?: ModelFamily` and `effort?: EffortLevel` to its options parameter type. If the type is shared with `RunHeadlessOptions`, this is automatic.
4. In `src/adapters/claude.ts`:
   - In the implementation of that method, forward `model` and `effort` to `runHeadlessClaude()` alongside the existing options. One-line passthrough.
5. Run `npm run typecheck` and fix any new type errors surfaced by the additions.

Do not write tests here; they are covered by Task 3.

</details>
