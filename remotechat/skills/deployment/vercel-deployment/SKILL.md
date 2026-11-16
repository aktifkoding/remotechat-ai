---
name: vercel-deployment
description: Trigger, monitor, and inspect Vercel Preview and Production deployments and build logs.
category: deployment
applicable_agents: [orchestrator, developer]
triggers: [deployment_phase, pr_created]
tools: [vercel:monitor_deployment, vercel:read_logs]
---
# Vercel Deployment

## Instructions
Track Vercel Preview Deployments triggered by PRs, fetch build logs on failure, and surface the live preview URL once `READY`.

## Required Context
- Vercel Project ID and Git branch/commit.

## Execution Steps
1. Poll Vercel Deployments API for matching branch/commit.
2. Stream or fetch build logs if status is `BUILDING` or `ERROR`.
3. Surface `https://...vercel.app` preview URL in the Live Preview panel.

## Expected Outputs
- Deployment status, build logs, and Live Preview URL.

## Validation Criteria
- Deployment reaches `READY` before presenting live preview.
