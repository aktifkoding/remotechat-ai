---
name: api-development
description: Build RESTful and streaming SSE API endpoints with consistent error envelopes and rate limiting.
category: development
applicable_agents: [developer]
triggers: [api_task]
tools: [github:read_file, github:write_file]
---
# API Development

## Instructions
Implement Next.js Route Handlers with structured JSON responses, Zod validation, auth guards, and idempotency support.

## Required Context
- API Specification.

## Execution Steps
1. Validate session and workspace membership.
2. Validate request body/query with Zod.
3. Return consistent `{ data, error }` or SSE streams.

## Expected Outputs
- Tested API route handlers.

## Validation Criteria
- Unauthorized requests return `401`/`403`; invalid payloads return `400`.
