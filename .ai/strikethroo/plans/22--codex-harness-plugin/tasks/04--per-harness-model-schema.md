---
id: 4
group: "abstraction-refactor"
dependencies: []
status: "completed"
created: 2026-05-15
skills:
  - typescript
  - zod
---

# Convert ModelChoiceSchema to a per-harness discriminated union

## Objective

Replace the single `ModelChoiceSchema = { name: ModelFamily, effort: EffortLevel }` with a Zod discriminated union keyed on `harness`. Each harness defines its own variant. The three settings fields `proposalModel`, `curatorModel`, `bootstrapModel` accept any variant; at runtime, code picks the entry whose `harness` matches the active adapter.

## Skills Required

- typescript
- zod (discriminated unions, `.strict()`)

## Acceptance Criteria

- [ ] `ModelChoiceSchema` in `src/lib/schemas.ts` becomes a `z.discriminatedUnion('harness', [...])` with two members:
  - `{ harness: 'claude', name: ModelFamily, effort: EffortLevel }` (strict)
  - `{ harness: 'codex', model: z.string().min(1), reasoningEffort: z.string().min(1).optional() }` (strict)
- [ ] `proposalModel`, `curatorModel`, `bootstrapModel` in the settings schema each accept one entry (single variant per setting, not an array) of this union
- [ ] `adapter.buildHarnessOpts(settings)` (Task 3) consumes the variant whose `harness` matches the adapter id; if mismatched, returns empty `harnessOpts` so the adapter falls back to defaults
- [ ] Example `config.yaml` under `src/templates-source/knowledge-base/config.yaml` updates to show the new `harness:` discriminator
- [ ] `npm run build` succeeds; `npm test` passes

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Zod schemas in `src/lib/schemas.ts`
- Settings reader in `src/lib/settings.ts`
- Template `config.yaml` in `src/templates-source/knowledge-base/`

## Input Dependencies

Coordinates with Task 3 (HeadlessRunOptions / buildHarnessOpts), but does not have a hard order dependency provided the two PRs agree on the shape of `buildHarnessOpts`.

## Output Artifacts

- Discriminated-union `ModelChoiceSchema`
- Updated settings template

## Implementation Notes

<details>
<summary>Guidance</summary>

- Codex models are opaque strings — no Zod enum. The `reasoningEffort` field is also a plain string for forward-compat with new Codex effort levels.
- `proposalModel` etc. each take exactly one variant. Mismatched-variant settings should not crash; `buildHarnessOpts` simply returns `{}` so the adapter falls back to whatever defaults its CLI provides.
- Update `src/templates-source/knowledge-base/config.yaml` example to show the new `harness: claude` (or `harness: codex`) field on each model entry, with a brief comment explaining the discriminator.
- Per `feedback_no_backwards_compat`: do not accept the old top-level `{ name, effort }` shape without a discriminator. Schema bumps are clean breaks.

</details>
