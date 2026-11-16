---
name: github-workflow
description: Manage feature branches, commits, Pull Requests, and GitHub Actions CI workflows.
category: deployment
applicable_agents: [developer, orchestrator]
triggers: [integration_phase, ci_dispatch]
tools: [github:create_branch, github:commit, github:create_pr, execution:dispatch_ci]
---
# GitHub Workflow

## Instructions
Keep `main` protected; work on feature branches, create descriptive commits, open Pull Requests, and monitor GitHub Actions checks.

## Required Context
- Repository, base branch, feature branch, and changed files.

## Execution Steps
1. Create or checkout feature branch.
2. Commit changes with conventional commit messages.
3. Open Pull Request and link SDLC/Orchestration run.

## Expected Outputs
- Commit SHA, PR URL, and CI status.

## Validation Criteria
- PR created cleanly with zero unresolved merge conflicts.
