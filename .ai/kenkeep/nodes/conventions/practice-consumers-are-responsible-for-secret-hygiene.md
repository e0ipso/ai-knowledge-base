---
schema_version: 2
id: practice-consumers-are-responsible-for-secret-hygiene
title: Consumers are responsible for secret hygiene
kind: practice
tags:
  - security
  - secrets
  - capture
  - documentation
derived_from: []
relates_to:
  - map-capture-hook
depends_on: []
confidence: high
summary: >-
  kenkeep does not scan or redact secrets in the capture pipeline; secret
  hygiene is the consumer's responsibility.
---
kenkeep does not perform secret scanning or redaction in the capture pipeline. Consumers are responsible for their own secret hygiene. The `init` command does not install secretlint, and the `doctor` command does not verify secret-scan availability.
