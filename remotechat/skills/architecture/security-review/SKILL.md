---
name: security-review
description: Audit architecture and code changes for OWASP Top 10, secret exposure, RLS, and auth flaws.
category: architecture
applicable_agents: [architect, reviewer]
triggers: [review_phase, pre_merge]
tools: [github:read_diff, github:read_file]
---
# Security Review

## Instructions
Verify that all credentials remain server-side, RLS policies protect tenant data, inputs are validated, and sensitive actions require approval.

## Required Context
- Git diff, modified files, and SQL migrations.

## Execution Steps
1. Scan for hardcoded secrets or client-exposed service keys.
2. Verify authentication and workspace authorization on every endpoint.
3. Check for SSRF, XSS, SQL injection, and missing webhook signature checks.

## Expected Outputs
- Security Findings Report with severity ratings.

## Validation Criteria
- Zero Critical security findings before merge approval.
