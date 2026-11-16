---
name: performance-optimization
description: Identify and resolve N+1 queries, unnecessary re-renders, and bundle bloat.
category: architecture
applicable_agents: [architect, developer, reviewer]
triggers: [review_phase, optimization_request]
tools: [github:read_file, github:read_diff]
---
# Performance Optimization

## Instructions
Evaluate database query patterns, caching, streaming, and client bundle size.

## Required Context
- Target source files or diff.

## Execution Steps
1. Check for N+1 DB calls or missing indexes.
2. Verify server/client component boundaries and memoization.
3. Recommend targeted optimizations.

## Expected Outputs
- Performance Audit & Optimization Recommendations.

## Validation Criteria
- Measurable reduction in query count or render overhead.
