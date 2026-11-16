---
name: task-planning
description: Break down technical specifications into ordered, dependency-aware engineering tasks.
category: core
applicable_agents: [architect, orchestrator]
triggers: [planning_phase]
tools: [sdlc:create_plan, orchestrator:delegate_agent]
---
# Task Planning

## Instructions
Decompose the approved architecture into atomic, dependency-ordered tasks assigned to `@developer`, `@qa`, and `@reviewer`.

## Required Context
- Architecture Document and Acceptance Criteria.

## Execution Steps
1. Group work by layer (DB, API, UI, Tests).
2. Define task dependencies and parallelizable units.
3. Assign responsible agents and risk levels.

## Expected Outputs
- Dependency-ordered Task Graph.

## Validation Criteria
- Zero circular dependencies; every task has a clear owner and done condition.
