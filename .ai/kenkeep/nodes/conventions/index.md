---
schema_version: 2
nodes_hash: 'sha256:9a434898ee5a0b054b1e1dcedf21d83e0d7a7ea561a02cbe98ac2449d5876674'
node_count: 6
---
# kenkeep Index: conventions

_6 node(s) in this folder • ~1500 estimated tokens_

## Subfolders
_None._

## Conventions (how we build)
- **Don't run curate or bootstrap-incremental in CI** [`conventions/practice-dont-run-llm-pipelines-in-ci.md`] Both spawn the model and produce changes to nodes/ that still need human review. CI validates what's committed, not new LLM output. #ci #llm #workflow
- **Conventional Commits drive semantic-release** [`conventions/practice-conventional-commits-and-release.md`] Releases are automated via semantic-release on merge to main. Commit type (feat/fix/etc.) determines version bump; no manual tag or npm publish. #git #release #conventional-commits
- **Do not justify scope decisions by current-snapshot file contents** [`conventions/practice-do-not-justify-scope-decisions-by-current-snapshot-file-contents.md`] Claims like 'that folder only contains code' are snapshot observations, not guarantees; decide scope from the underlying principle, not from what files happen to exist today. #yagni #assumptions #verification
- **Document model recommendations with harness-agnostic framing** [`conventions/practice-document-model-recommendations-with-harness-agnostic-framing-2.md`] When recommending model/effort configurations, avoid naming specific models; use harness-agnostic framing with per-harness examples. #documentation #harness #models #recommendations
- **No em dashes anywhere in the project** [`conventions/practice-no-em-dashes.md`] Prohibit em dashes in all files to avoid patterns that signal AI-generated text. Restructure with commas or periods instead. #style #writing #ai-detection
- **Testing philosophy: few tests, mostly integration** [`conventions/practice-testing-philosophy-few-tests-mostly-integration.md`] This repo deliberately keeps a small test suite weighted toward integration tests; redundant unit tests are pruned. #testing #philosophy #integration-tests #coverage

## Components (what exists)
_None yet._

## By topic

- **#ai-detection (1):** No em dashes anywhere in the project
- **#assumptions (1):** Do not justify scope decisions by current-snapshot file contents
- **#ci (1):** Don't run curate or bootstrap-incremental in CI
- **#conventional-commits (1):** Conventional Commits drive semantic-release
- **#coverage (1):** Testing philosophy: few tests, mostly integration
- **#documentation (1):** Document model recommendations with harness-agnostic framing
- **#git (1):** Conventional Commits drive semantic-release
- **#harness (1):** Document model recommendations with harness-agnostic framing
- **#integration-tests (1):** Testing philosophy: few tests, mostly integration
- **#llm (1):** Don't run curate or bootstrap-incremental in CI
- **#models (1):** Document model recommendations with harness-agnostic framing
- **#philosophy (1):** Testing philosophy: few tests, mostly integration
- **#recommendations (1):** Document model recommendations with harness-agnostic framing
- **#release (1):** Conventional Commits drive semantic-release
- **#style (1):** No em dashes anywhere in the project
- **#testing (1):** Testing philosophy: few tests, mostly integration
- **#verification (1):** Do not justify scope decisions by current-snapshot file contents
- **#workflow (1):** Don't run curate or bootstrap-incremental in CI
- **#writing (1):** No em dashes anywhere in the project
- **#yagni (1):** Do not justify scope decisions by current-snapshot file contents
