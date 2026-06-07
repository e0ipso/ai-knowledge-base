---
schema_version: 2
id: practice-no-em-dashes
title: No em dashes anywhere in the project
kind: practice
tags:
  - style
  - writing
  - ai-detection
derived_from: []
relates_to: []
confidence: high
summary: >-
  Prohibit em dashes in all files to avoid patterns that signal AI-generated
  text. Restructure with commas or periods instead.
---
Never use em dashes (—) in any file: code, comments, docs, commit messages, changelogs, or prose. Em dashes are a telltale pattern of AI-generated text, and their presence undermines the authenticity of the output.

**Instead of an em dash, restructure the sentence using a comma or period.** Do not substitute with double hyphens (--) or en dashes either; rewrite the sentence so no dash-like punctuation is needed.

### Examples

- **Bad:** "The system handles retries — including exponential backoff — automatically."
- **Good:** "The system handles retries, including exponential backoff, automatically."
- **Also good:** "The system handles retries automatically. This includes exponential backoff."
