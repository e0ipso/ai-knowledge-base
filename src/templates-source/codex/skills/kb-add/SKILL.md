---
name: kb-add
description: Capture a knowledge-base node manually from the current session. Writes a new node directly under `.ai/knowledge-base/nodes/<kind>/`. The reviewer accepts via `git commit` and rejects via `git restore`. Use when the user wants to record a project convention, gotcha, rationale, or named-thing into the project knowledge base.
---

# kb-add

Capture one piece of knowledge into the project KB. The CLI writes the file and regenerates the index; the user reviews with `git diff`.

Ask the user for seven values (do not invent any): **kind** (`practice` or `map`), **title** (≤ 80 chars), **summary** (≤ 140 chars), **tags** (comma-separated), **body** (full markdown; for practice include the rationale), **relates_to** (comma-separated node ids, may be empty), **confidence** (`high`/`medium`/`low`, default `high`).

Before invoking, skim `.ai/knowledge-base/INDEX.md` (already in context) for an overlapping node. If one exists, offer to edit it, refine the candidate's title, or drop the capture instead. Push back if the candidate is: code that speaks for itself, history, a debugging recipe, in-flight plan/task content, or general programming knowledge.

Then run the following command:

```bash
npx @e0ipso/ai-knowledge-base node add --harness codex \
  --kind <practice|map> --title "<title>" --summary "<summary>" \
  --tags "<tags>" --relates-to "<relates-to>" \
  --confidence <high|medium|low> --body @- --yes <<'EOF'
<body markdown>
EOF
```

`--body @-` reads stdin so multi-line markdown does not need escaping. The CLI fails loud on a slug collision; pick a more specific title if it complains. After it returns, give the user the printed path and remind them to review with `git diff`.
