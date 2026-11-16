---
name: e2e-testing
description: Validate critical user journeys across UI, auth, and live preview deployments using Playwright.
category: quality
applicable_agents: [qa]
triggers: [testing_phase, pre_release]
tools: [github:read_file, github:write_test_file, execution:dispatch_ci, execution:read_logs]
---
# E2E Testing

## Instructions
Run browser-level E2E flows against preview deployments or local test servers in CI.

## Required Context
- Preview URL or CI test server configuration.

## Execution Steps
1. Define critical user flows.
2. Execute Playwright suite in CI.
3. Collect failure traces/screenshots if any fail.

## Expected Outputs
- E2E Test Report & Artifacts.

## Validation Criteria
- Zero failing E2E assertions.
