---
name: integration-testing
description: Verify API endpoints, database queries, RLS policies, and external integration adapters.
category: quality
applicable_agents: [qa]
triggers: [testing_phase]
tools: [github:read_file, github:write_test_file, execution:dispatch_ci, execution:read_logs]
---
# Integration Testing

## Instructions
Test end-to-end API route contracts, auth/RLS boundaries, and integration adapters against realistic payloads.

## Required Context
- API routes and database schema.

## Execution Steps
1. Author integration test suites.
2. Run suite in GitHub Actions / cloud runner.
3. Inspect logs and report any regressions.

## Expected Outputs
- Integration Test Report.

## Validation Criteria
- All API and authorization assertions pass.
