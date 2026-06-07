---
schema_version: 2
id: practice-do-not-justify-scope-decisions-by-current-snapshot-file-contents
title: Do not justify scope decisions by current-snapshot file contents
kind: practice
tags:
  - yagni
  - assumptions
  - verification
derived_from: []
relates_to: []
confidence: high
summary: >-
  Claims like 'that folder only contains code' are snapshot observations, not
  guarantees; decide scope from the underlying principle, not from what files
  happen to exist today.
---
When deciding whether to include or exclude a path or folder from a behavior, do not justify the decision by what files currently live there (e.g. 'hooks dirs only contain .ts/.mjs today, so the markdown filter handles it'). That is a snapshot observation, not a guarantee -- user-authored or third-party additions can change the directory's contents at any time.

Decide scope from the underlying principle that motivated the rule. If the principle applies to the folder's purpose (e.g. 'AI instructions, not project docs'), apply the rule to the folder regardless of its current file inventory.

When tempted to narrow scope with 'that case does not exist today', re-check whether the motivating principle covers the omitted case. If yes, include it.
