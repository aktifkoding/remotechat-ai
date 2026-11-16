---
name: supabase-integration
description: Inspect Supabase schemas, preview SQL migrations, and manage approval-gated database changes.
category: deployment
applicable_agents: [architect, developer, orchestrator]
triggers: [schema_change, supabase_sync]
tools: [supabase:inspect_schema, supabase:generate_migration, supabase:preview_sql]
---
# Supabase Integration

## Instructions
Never expose `SUPABASE_SERVICE_ROLE_KEY` to browsers or AI models. Always generate a migration file, SQL preview, risk assessment, and rollback plan before requesting user approval.

## Required Context
- Connected Supabase project ref.

## Execution Steps
1. Inspect target tables and RLS policies.
2. Generate versioned SQL migration.
3. Request human approval before applying to database.

## Expected Outputs
- Migration SQL, Risk Assessment, and Execution Status.

## Validation Criteria
- Approval recorded in `approval_requests` before execution.
