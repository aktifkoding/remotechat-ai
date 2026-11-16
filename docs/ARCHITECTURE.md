# System Architecture Document — RemoteChat AI

## 1. High-Level Architecture

RemoteChat AI is a cloud-native, multi-tenant Next.js App Router platform backed by Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions), GitHub (source of truth + Actions CI), Vercel (Preview & Production Deployments), and OpenAI-compatible AI providers.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         RemoteChat AI Web Client                         │
│  Next.js App Router • Tailwind CSS • Zustand • TanStack Query            │
│  Monaco Editor • xterm.js • React Resizable Panels • Framer Motion       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS / SSE / Supabase Realtime
┌───────────────────────────────▼──────────────────────────────────────────┐
│                     RemoteChat Server & API Layer                        │
│  Next.js Route Handlers (/api/*) • Server Actions • Middleware           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ AI Engine    │ │ Orchestrator │ │ Skills Engine│ │ SDLC Engine    │  │
│  │ (OpenAI API) │ │ (State Mach) │ │ (SKILL.md)   │ │ (8 Phases)     │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────┬────────┘  │
│  ┌──────▼────────────────▼────────────────▼─────────────────▼────────┐  │
│  │ Security & Encryption Layer (AES-256-GCM, RBAC, SSRF, Audit)      │  │
│  └──────┬────────────────┬────────────────┬─────────────────┬────────┘  │
└─────────┼────────────────┼────────────────┼─────────────────┼────────────┘
          │                │                │                 │
┌─────────▼──────┐ ┌───────▼───────┐ ┌──────▼───────┐ ┌───────▼──────────┐
│ Supabase       │ │ GitHub API    │ │ Vercel API   │ │ Custom AI        │
│ Postgres + RLS │ │ Repos/PRs/CI  │ │ Deploy/Logs  │ │ OpenAI-Compat    │
└────────────────┘ └───────────────┘ └──────────────┘ └──────────────────┘
```

## 2. Database ERD (Core Domains)

- **Identity & Workspace:** `profiles` ← `workspace_members` → `workspaces` ← `workspace_invitations`
- **Projects:** `workspaces` → `projects` → (`project_members`, `project_integrations`, `project_settings`, `project_environments`)
- **Integrations:** `workspaces` → (`github_connections` → `github_repositories`, `supabase_connections` → `supabase_projects`, `vercel_connections` → `vercel_projects`, `integration_sync_logs`)
- **AI Providers:** `workspaces` → `ai_providers` → (`ai_models`, `ai_provider_configs`, `ai_usage_logs`)
- **Agents & Orchestration:** `agents` → (`agent_configs`, `agent_permissions`, `agent_executions` → `agent_execution_logs`); `orchestration_runs` → (`orchestration_tasks` → `orchestration_dependencies`, `orchestration_events`)
- **Skills:** `skills` → (`skill_versions`, `project_skills`, `skill_sync_logs`)
- **SDLC & Execution:** `sdlc_workflows` → `sdlc_phases` → `development_tasks`; `test_runs` → `test_cases`; `code_reviews`; `deployment_records`; `cloud_jobs` → (`cloud_job_logs`, `cloud_job_artifacts`)
- **Chat & Security:** `conversations` → `conversation_messages` → (`message_attachments`, `message_tool_calls`); `audit_logs`, `approval_requests`, `encrypted_credentials`

All workspace-scoped tables enforce **Row Level Security (RLS)** via `is_workspace_member(workspace_id)`.

## 3. Agent Orchestration State Machine

States: `pending` → `queued` → `in_progress` → (`needs_approval` | `blocked` | `failed` | `completed` | `cancelled`).

Default `@orchestrator` pipeline:
1. **Requirement Analysis** (`@architect`) — Parses user prompt, repo structure, existing conventions.
2. **Architecture & Plan** (`@architect`) — Produces Architecture Doc, DB/API spec, implementation roadmap.
3. **Implementation** (`@developer`) — Creates branch, edits/creates files, prepares DB migrations.
4. **Cloud Testing** (`@qa`) — Writes tests, dispatches GitHub Actions CI, inspects real test results.
5. **Independent Review** (`@reviewer`) — Reviews git diff for security, quality, architecture compliance.
6. **Remediation Loop** (`@developer` → `@qa`, bounded max 2 iterations to prevent infinite loops).
7. **Final Verification** (`@architect`) — Validates all acceptance criteria.
8. **Integration & Approval** (`@orchestrator`) — Requests user approval for sensitive actions (PR merge / DB migration / Prod deploy), creates PR, polls Vercel Preview Deployment.
9. **Synthesis** (`@orchestrator`) — Produces final report with PR link & live preview URL.

## 4. Skills Architecture (`remotechat/skills/`)

Each `SKILL.md` uses YAML frontmatter (`name`, `description`, `category`, `applicable_agents`, `triggers`, `tools`) + structured Markdown (`Instructions`, `Required Context`, `Execution Steps`, `Expected Outputs`, `Validation Criteria`).
Two-way sync with repository `SKILL.md`, `skills.md`, and `AGENTS.md` uses a non-destructive 5-step pipeline: **Detect → Compare → Preview → Merge → Sync**.

## 5. UI/UX Design System

- **Palette (Dark First):** Background `#09090B`, Surface `#111114`, Secondary `#18181B`, Border `#27272A`, Primary `#8B5CF6`, Accent `#06B6D4`, Success `#22C55E`, Warning `#F59E0B`, Error `#EF4444`.
- **Typography:** `Inter` (UI), `JetBrains Mono` (code & terminal).
- **Layout:** Collapsible left navigation sidebar, top bar (Project Switcher, Branch Selector, Status, User), and a 3-pane `react-resizable-panels` Project Workspace (Explorer/Agents | Chat/Monaco/xterm | Live Preview).
