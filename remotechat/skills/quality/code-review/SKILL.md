---
name: code-review
description: Conduct independent review of pull requests and diffs for correctness, security, and maintainability.
category: quality
applicable_agents: [reviewer]
triggers: [review_phase, pull_request_opened]
tools: [github:read_diff, github:read_file, github:submit_review]
---
# Code Review

## Instructions
Review every changed line independently from `@developer`. Classify issues by severity (Critical, Major, Minor, Suggestion).

## Required Context
- Branch diff and Architecture Plan.

## Execution Steps
1. Inspect full diff and linked tests.
2. Verify error handling, security, types, and architecture alignment.
3. Submit structured review verdict (`approved` or `changes_requested`).

## Expected Outputs
- Code Review Report.

## Validation Criteria
- Clear verdict backed by concrete file/line references.
