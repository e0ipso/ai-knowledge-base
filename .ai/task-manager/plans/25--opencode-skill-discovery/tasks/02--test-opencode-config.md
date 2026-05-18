---
id: 2
group: "opencode-installer"
dependencies: [1]
status: "pending"
created: "2026-05-19"
skills: ["vitest", "typescript"]
---
# Test `.opencode/opencode.json` creation and idempotency

## Objective
Add Vitest assertions in `tests/init.test.ts` that verify the OpenCode installer creates `.opencode/opencode.json` with the correct `skills.paths` entry, and that re-running `init` is idempotent (does not clobber existing config or create duplicate entries).

## Skills Required
- `vitest`: Writing integration test assertions using the existing test helpers (`runCli`, `makeSandbox`, `cleanSandbox`)
- `typescript`: Type-safe access to parsed JSON structures in test assertions

## Acceptance Criteria
- [ ] A test verifies that after `init --harnesses opencode`, `.opencode/opencode.json` exists and its `skills.paths` array includes `.opencode/skills`.
- [ ] A test verifies idempotent merge behavior: when `.opencode/opencode.json` already contains custom keys (e.g. `model: "gpt-4"`) and custom `skills.paths`, re-running `init --harnesses opencode` preserves the custom keys and deduplicates the array so `.opencode/skills` appears exactly once.
- [ ] `npm test` passes with no regressions.

## Technical Requirements
- Use `runCli(sandbox, ['init', '--harnesses', 'opencode'])` to exercise the installer.
- Use `readFileSync` and `JSON.parse` to inspect the generated config.
- Use `writeFileSync` to pre-seed an existing `.opencode/opencode.json` before the second init invocation in the idempotency test.
- Follow the existing test style: `beforeEach`/`afterEach` for sandbox lifecycle, `async/await` for CLI calls.

## Input Dependencies
- Task 1 implementation (the installer logic that writes/merges the config file)

## Output Artifacts
- Modified `tests/init.test.ts`

## Implementation Notes
<details>
**Meaningful Test Strategy Guidelines:**

Your critical mantra for test generation is: "write a few tests, mostly integration".

**Definition of "Meaningful Tests":**
Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.

**When TO Write Tests:**
- Custom business logic and algorithms
- Critical user workflows and data transformations
- Edge cases and error conditions for core functionality
- Integration points between different system components
- Complex validation logic or calculations

**When NOT to Write Tests:**
- Third-party library functionality (already tested upstream)
- Framework features (React hooks, Express middleware, etc.)
- Simple CRUD operations without custom logic
- Getter/setter methods or basic property access
- Configuration files or static data
- Obvious functionality that would break immediately if incorrect

For the creation test, assert:
```ts
const config = JSON.parse(readFileSync(join(sandbox, '.opencode/opencode.json'), 'utf8'));
expect(config.skills).toBeDefined();
expect(config.skills.paths).toContain('.opencode/skills');
```

For the idempotency test:
1. Create sandbox, run `git init`, write a pre-existing `.opencode/opencode.json`:
   ```json
   { "model": "gpt-4", "skills": { "paths": [".opencode/skills", "custom/skills"] } }
   ```
2. Run `init --harnesses opencode`.
3. Parse the resulting config.
4. `expect(config.model).toBe('gpt-4');`
5. `expect(config.skills.paths).toEqual(['.opencode/skills', 'custom/skills']);` (or use a set-based assertion to verify no duplicates and both entries present).

Do not test simple JSON.parse/stringify behavior; focus on the installer's merge logic.
</details>
