---
name: system-design
description: Design scalable system architecture, database schemas, and API contracts.
category: architecture
applicable_agents: [architect]
triggers: [planning_phase, architecture_review]
tools: [github:read_tree, github:read_file, supabase:inspect_schema]
---
# System Design

## Instructions
Produce a cohesive technical design covering data models, API routes, state management, and integration boundaries.

## Required Context
- Project Analysis output and Requirement Analysis.

## Execution Steps
1. Inspect existing DB schema and API conventions.
2. Design new tables/columns with RLS and indexes.
3. Define API contracts and component boundaries.

## Expected Outputs
- Architecture Document, Database Design, API Specification.

## Validation Criteria
- Design preserves backward compatibility and enforces tenant isolation.
