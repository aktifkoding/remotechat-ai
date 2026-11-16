---
name: unit-testing
description: Write and execute isolated unit tests for services, utilities, and UI components.
category: quality
applicable_agents: [qa]
triggers: [testing_phase]
tools: [github:read_file, github:write_test_file, execution:dispatch_ci, execution:read_logs]
---
# Unit Testing

## Instructions
Create deterministic unit tests (Vitest/Jest) covering happy paths, edge cases, and error handling, and execute them via the Cloud Execution Engine.

## Required Context
- Modified source files and test runner config.

## Execution Steps
1. Identify new/changed functions and components.
2. Author unit tests with isolated mocks.
3. Dispatch cloud CI job and verify exit code 0.

## Expected Outputs
- Test Plan, Test Cases, and real Cloud Test Report.

## Validation Criteria
- 100% of executed unit tests pass with real runner output.
