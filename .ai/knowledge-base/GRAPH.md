---
schema_version: 1
generated_at: '2026-05-12T11:16:56.631Z'
nodes_hash: 'sha256:0d68c018bb3dbf7ae272157d9d4c0d5f6aa9568a2dec64233e70cc1b07c5dd60'
node_count: 23
---
# KB Graph

Total nodes: 23

## map-adapter-interface

- **kind:** map
- **status:** valid
- **title:** Adapter interface: src/adapters/types.ts
- **tags:** adapters, interface, claude-code, extension-point
- **relates_to:** practice-v1-claude-code-only, map-ai-knowledge-base-cli
- **derived_from:** docs/internals/architecture.md

## map-ai-knowledge-base-cli

- **kind:** map
- **status:** valid
- **title:** ai-knowledge-base CLI: the package binary
- **tags:** cli, commander, binary
- **relates_to:** map-kb-claude-skills, map-adapter-interface
- **derived_from:** docs/cli-reference.md, docs/internals/architecture.md

## map-bootstrap-state-file

- **kind:** map
- **status:** valid
- **title:** .state/bootstrap-state.json: per-doc SHA-256 cache for bootstrap
- **tags:** state, bootstrap, hashing, gitignore
- **relates_to:** map-ai-knowledge-base-cli
- **derived_from:** docs/internals/schemas.md

## map-claude-hooks

- **kind:** map
- **status:** valid
- **title:** The three Claude Code hooks registered by init
- **tags:** hooks, claude-code, capture, extract, consume
- **relates_to:** practice-hooks-meet-1s-deadline, practice-recursion-guard-env-var
- **derived_from:** docs/internals/hooks.md, docs/internals/architecture.md

## map-index-and-graph-files

- **kind:** map
- **status:** valid
- **title:** INDEX.md and GRAPH.md: deterministic outputs derived from nodes/
- **tags:** index, graph, deterministic, generated
- **relates_to:** map-nodes-directory, practice-determinism-contract
- **derived_from:** docs/how-it-works.md, docs/internals/architecture.md, docs/internals/schemas.md

## map-kb-claude-skills

- **kind:** map
- **status:** valid
- **title:** Claude Code skills: /kb-curate, /kb-add, /kb-bootstrap
- **tags:** skills, claude-code, curate, add, bootstrap
- **relates_to:** map-ai-knowledge-base-cli, map-pending-conflicts-file
- **derived_from:** docs/cli-reference.md, docs/daily-use.md, PRD.md

## map-map-node

- **kind:** map
- **status:** valid
- **title:** Map node: what-exists, named entities and vocabulary
- **tags:** vocabulary, node-kind, map
- **relates_to:** map-practice-node, map-nodes-directory
- **derived_from:** docs/how-it-works.md, docs/internals/schemas.md, PRD.md

## map-nodes-directory

- **kind:** map
- **status:** valid
- **title:** nodes/: the canonical knowledge tree
- **tags:** storage, nodes, canonical, git
- **relates_to:** map-practice-node, map-map-node, map-index-and-graph-files
- **derived_from:** docs/how-it-works.md, docs/internals/architecture.md

## map-pending-conflicts-file

- **kind:** map
- **status:** valid
- **title:** .state/pending-conflicts.json: curator-detected contradictions
- **tags:** state, curator, contradictions, kb-curate
- **relates_to:** map-claude-hooks, map-kb-claude-skills, practice-curator-read-only-tool
- **derived_from:** docs/internals/schemas.md, docs/how-it-works.md

## map-practice-node

- **kind:** map
- **status:** valid
- **title:** Practice node: how-we-build, imperative guidance
- **tags:** vocabulary, node-kind, practice
- **relates_to:** map-map-node, map-nodes-directory
- **derived_from:** docs/how-it-works.md, docs/internals/schemas.md, PRD.md

## map-project-config-json

- **kind:** map
- **status:** valid
- **title:** .ai/knowledge-base/config.yaml: project-level tunables
- **tags:** settings, config, tunables
- **relates_to:** map-ai-knowledge-base-cli
- **derived_from:** docs/cli-reference.md

## map-sessions-directory

- **kind:** map
- **status:** valid
- **title:** _sessions/: captured session logs (gitignored by default)
- **tags:** storage, capture, sessions, gitignore
- **relates_to:** map-claude-hooks, map-nodes-directory
- **derived_from:** docs/internals/architecture.md, docs/internals/schemas.md, PRD.md

## map-state-json-file

- **kind:** map
- **status:** valid
- **title:** .state/state.json: lock and nudge timestamp
- **tags:** state, lock, nudge, gitignore
- **relates_to:** map-claude-hooks
- **derived_from:** docs/internals/schemas.md, docs/internals/architecture.md

## practice-atomic-prs-with-paired-docs

- **kind:** practice
- **status:** valid
- **title:** One logical change per PR, with the docs update for that change
- **tags:** git, pr, review, docs
- **derived_from:** CONTRIBUTING.md

## practice-conventional-commits

- **kind:** practice
- **status:** valid
- **title:** Conventional Commits are required: they drive the release
- **tags:** git, releases, commits, semantic-release
- **derived_from:** CONTRIBUTING.md

## practice-curator-read-only-tool

- **kind:** practice
- **status:** valid
- **title:** The curator's only allowed tool is Read
- **tags:** curator, prompts, tools, claude-code
- **derived_from:** docs/internals/prompts.md

## practice-determinism-contract

- **kind:** practice
- **status:** valid
- **title:** INDEX/GRAPH and nodes_hash are deterministic and content-addressed
- **tags:** determinism, hashing, index, graph, testing
- **relates_to:** map-index-and-graph-files, map-nodes-directory
- **derived_from:** docs/internals/architecture.md, docs/internals/schemas.md

## practice-hooks-meet-1s-deadline

- **kind:** practice
- **status:** valid
- **title:** Sync hooks must finish in under 1 second
- **tags:** hooks, performance, claude-code, contract
- **relates_to:** map-claude-hooks
- **derived_from:** docs/internals/hooks.md, docs/internals/manual-test-plan.md

## practice-no-llm-pipelines-in-ci

- **kind:** practice
- **status:** valid
- **title:** Never run curate or bootstrap-incremental in CI
- **tags:** ci, curate, bootstrap, policy
- **relates_to:** map-ai-knowledge-base-cli
- **derived_from:** docs/daily-use.md

## practice-no-schema-migrators

- **kind:** practice
- **status:** valid
- **title:** Strict schema-version policy: clean break, no migrators
- **tags:** schema, versioning, policy, no-legacy
- **relates_to:** map-zod-schemas
- **derived_from:** CONTRIBUTING.md

## practice-prompt-versioning

- **kind:** practice
- **status:** valid
- **title:** Bump the Version: N comment on every prompt behavior change
- **tags:** prompts, versioning, changelog
- **derived_from:** CONTRIBUTING.md, docs/internals/prompts.md

## practice-recursion-guard-env-var

- **kind:** practice
- **status:** valid
- **title:** Set KB_BUILDER_INTERNAL=1 on every internal claude -p subprocess
- **tags:** hooks, recursion, env-vars, claude-code
- **relates_to:** map-claude-hooks
- **derived_from:** docs/internals/hooks.md, docs/internals/architecture.md

## practice-v1-claude-code-only

- **kind:** practice
- **status:** valid
- **title:** v1 ships Claude Code only; the adapter interface is preparation, not plurality
- **tags:** adapters, scope, claude-code, v1
- **relates_to:** map-adapter-interface
- **derived_from:** PRD.md, docs/internals/architecture.md
