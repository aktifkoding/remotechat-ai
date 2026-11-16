---
name: requirement-analysis
description: Transform user prompts into clear functional requirements, user stories, and acceptance criteria.
category: core
applicable_agents: [architect, orchestrator]
triggers: [user_prompt_received, discovery_phase]
tools: [sdlc:create_plan]
---
# Requirement Analysis

## Instructions
Extract explicit and implicit requirements from the user's request, identify edge cases, and define measurable acceptance criteria.

## Required Context
- User prompt and project context.

## Execution Steps
1. Identify primary user goal and affected system boundaries.
2. Define user stories and non-functional constraints (security, performance).
3. Produce testable acceptance criteria.

## Expected Outputs
- Problem Definition, User Stories, Acceptance Criteria.

## Validation Criteria
- Every requirement maps to at least one verifiable acceptance criterion.
