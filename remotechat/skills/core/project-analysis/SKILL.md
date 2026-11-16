---
name: project-analysis
description: Analyze repository file structure, tech stack, dependencies, and coding conventions.
category: core
applicable_agents: [architect, developer, qa, reviewer]
triggers: [repository_connected, new_feature_request]
tools: [github:read_tree, github:read_file]
---
# Project Analysis

## Instructions
Inspect the target repository's `package.json`, configuration files, directory layout, and existing modules before proposing or writing code.

## Required Context
- GitHub repository full name and active branch.

## Execution Steps
1. Fetch the repository file tree.
2. Read manifest files (`package.json`, `tsconfig.json`, `next.config.*`, etc.).
3. Identify frameworks, styling, state management, test runners, and auth patterns.

## Expected Outputs
- Structured Tech Stack & Convention Summary.

## Validation Criteria
- All identified frameworks and file paths must exist in the inspected repository tree.
