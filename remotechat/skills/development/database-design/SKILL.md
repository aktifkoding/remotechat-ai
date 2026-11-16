---
name: database-design
description: Author versioned PostgreSQL migrations with RLS policies, indexes, and rollback plans.
category: development
applicable_agents: [developer, architect]
triggers: [schema_change, migration_task]
tools: [supabase:inspect_schema, supabase:generate_migration, supabase:preview_sql]
---
# Database Design

## Instructions
Create idempotent, versioned SQL migrations with foreign keys, indexes, and Row Level Security.

## Required Context
- Existing Supabase schema and Entity Relationship Design.

## Execution Steps
1. Inspect current tables and policies.
2. Write SQL migration with `UP` and rollback notes.
3. Submit SQL preview and risk assessment for user approval before execution.

## Expected Outputs
- Versioned `.sql` migration file + Risk Assessment.

## Validation Criteria
- RLS enabled on all tenant-scoped tables.
