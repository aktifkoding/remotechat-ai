---
name: backend-development
description: Implement server-side services, repositories, authentication, and business logic.
category: development
applicable_agents: [developer]
triggers: [development_phase, backend_task]
tools: [github:read_file, github:write_file]
---
# Backend Development

## Instructions
Separate domain logic, data access, and HTTP transport layers. Enforce auth, workspace isolation, and input validation.

## Required Context
- API Specification and Database Schema.

## Execution Steps
1. Define Zod validation schemas.
2. Implement service & repository functions.
3. Wire thin route handlers with proper HTTP status codes.

## Expected Outputs
- Modular server services and API route handlers.

## Validation Criteria
- All inputs validated; secrets never leaked in responses or logs.
