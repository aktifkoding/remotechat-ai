---
name: refactoring
description: Improve code structure, eliminate duplication, and preserve behavior with regression tests.
category: development
applicable_agents: [developer]
triggers: [refactor_request, review_feedback]
tools: [github:read_file, github:write_file]
---
# Refactoring

## Instructions
Extract shared helpers, reduce nesting, and align code with existing project patterns without altering external behavior.

## Required Context
- Target files and test suite.

## Execution Steps
1. Verify existing test coverage.
2. Apply incremental structural improvements.
3. Re-run tests to confirm zero regressions.

## Expected Outputs
- Cleaner, modular code diff.

## Validation Criteria
- All existing tests continue to pass.
