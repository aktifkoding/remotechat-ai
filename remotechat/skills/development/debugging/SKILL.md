---
name: debugging
description: Diagnose runtime errors, build failures, and failing tests from logs and stack traces.
category: development
applicable_agents: [developer, qa]
triggers: [build_failed, test_failed, runtime_error]
tools: [github:read_file, execution:read_logs, github:write_file]
---
# Debugging

## Instructions
Trace root causes from Vercel build logs, GitHub Actions test output, or runtime stack traces before applying minimal, targeted fixes.

## Required Context
- Error logs, stack trace, and affected source files.

## Execution Steps
1. Reproduce or pinpoint the failing symbol/line from logs.
2. Inspect surrounding state and types.
3. Apply fix and verify via cloud test/build run.

## Expected Outputs
- Root cause explanation and verified patch.

## Validation Criteria
- Previously failing check passes after the fix.
