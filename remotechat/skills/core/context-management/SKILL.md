---
name: context-management
description: Summarize and prune conversation and codebase context to fit model context windows efficiently.
category: core
applicable_agents: [orchestrator, architect, developer, qa, reviewer]
triggers: [context_threshold_reached]
tools: [github:read_file]
---
# Context Management

## Instructions
Maintain high-signal context across multi-agent turns without exceeding the configured AI provider's `context_window`.

## Required Context
- Active conversation history and orchestration run state.

## Execution Steps
1. Prioritize recently modified files, active plan, and failing test/review logs.
2. Summarize older turns into structured state checkpoints.

## Expected Outputs
- Compacted Context Payload.

## Validation Criteria
- Token count stays within 80% of the provider's context window.
