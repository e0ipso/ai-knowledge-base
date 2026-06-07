---
schema_version: 2
nodes_hash: 'sha256:5f4e39e059eaff6b1eed95b9ad9e9688632b6f5114f0cd8f7e56471b922d4ecc'
node_count: 2
---
# kenkeep Index: prompts

_2 node(s) in this folder • ~723 estimated tokens_

## Subfolders
_None._

## Conventions (how we build)
- **Local prompt overrides fall back to bundled templates** [`prompts/practice-local-prompt-overrides-fall-back-to-bundled.md`] Each LLM pipeline loads its prompt from .ai/kenkeep/.config/prompts/<name>.md first, then the bundled fallback. Delete the override to revert. #prompts #customization #override
- **Bump the prompt's Version comment on every behavior change** [`prompts/practice-bump-prompt-version-comment.md`] Each prompt template carries a top-of-file Version: N comment. Bump it on every behavior change; logs record the prompt so audits remain coherent. #prompts #versioning #audit

## Components (what exists)
_None yet._

## By topic

- **#prompts (2):** Local prompt overrides fall back to bundled templates, Bump the prompt's Version comment on every behavior change
- **#audit (1):** Bump the prompt's Version comment on every behavior change
- **#customization (1):** Local prompt overrides fall back to bundled templates
- **#override (1):** Local prompt overrides fall back to bundled templates
- **#versioning (1):** Bump the prompt's Version comment on every behavior change
