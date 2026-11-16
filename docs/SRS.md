# Software Requirements Specification (SRS) — RemoteChat AI

**Tagline:** *"Your Entire Development Team. One Remote Workspace."*

## 1. Purpose & Scope
RemoteChat AI is a cloud-based AI software engineering platform that enables developers and teams to design, build, test, review, and deploy software remotely through a unified conversational and visual workspace. Unlike a generic chat UI, RemoteChat integrates directly with GitHub (source of truth), Supabase (backend & database), Vercel (preview & production hosting), and custom OpenAI-compatible AI providers, orchestrated by a durable multi-agent state machine and a built-in Skills Engine.

## 2. Functional Requirements

### 2.1 Authentication & Workspace Management
- Email/password and OAuth authentication via Supabase Auth.
- Multi-tenant workspaces (`workspaces`, `workspace_members`, `workspace_invitations`) with Row Level Security (RLS).
- Project creation, switching, and per-project integration & model bindings.

### 2.2 Cloud Integrations
- **GitHub:** OAuth / Personal Access Token (encrypted server-side), repository listing, branch listing/creation, file tree & file content read/write/delete, commit creation, Pull Request creation & review, GitHub Actions workflow dispatch & log/status monitoring, webhook verification.
- **Supabase:** Account/Management API or project connection, schema/table inspection, SQL preview & approval-gated execution, migration generation & tracking, storage/auth/realtime config inspection.
- **Vercel:** Account connection, project listing, GitHub repo linking, deployment listing & creation, real-time build log & status polling, preview URL extraction, environment variable management, rollback support.

### 2.3 Custom AI Provider Configuration
- Multiple OpenAI-compatible providers (`ai_providers`, `ai_models`, `ai_usage_logs`).
- Configurable Provider Name, Type, Base URL, encrypted API Key, Model Name, Default Model, Context Window, Max Output Tokens, Temperature, Top P, Timeout, Custom Headers, Streaming & Tool Calling flags.
- Server-side AES-256-GCM encryption for all secrets; keys are never returned to the client or stored in `localStorage`.
- Connection & model response testing, token consumption & cost estimation, fallback provider support.

### 2.4 Built-in Multi-Agent System & Orchestrator
- Four default built-in agents:
  1. **Solution Architect (`@architect`)**: Requirement analysis, system/DB/API architecture, risk assessment, final verification. Read-only repo access + plan generation.
  2. **Senior Fullstack Developer (`@developer`)**: Codebase analysis, multi-file implementation, refactoring, debugging. Read/write project branch access.
  3. **QA Engineer (`@qa`)**: Test plan/cases, cloud test execution (Vitest/Jest/Playwright via GitHub Actions), regression reporting. Cannot pass without real test execution.
  4. **Code Reviewer (`@reviewer`)**: Independent code quality, security, performance, and architecture compliance review. Read diff + submit review.
- **RemoteChat Agent Orchestrator (`@orchestrator`)**: Durable state-machine orchestration (`pending`, `queued`, `in_progress`, `blocked`, `needs_approval`, `failed`, `completed`, `cancelled`), dependency graph, retries with exponential backoff, loop prevention, cancellation, token accounting, and final synthesis.

### 2.5 Built-in Skills Engine & Synchronization
- Folder-based `remotechat/skills/` (`core`, `development`, `quality`, `architecture`, `deployment`) and `remotechat/agents/` definitions.
- Supports built-in, project-specific, and custom skills with versioning, activation toggles, editing, import/export, and execution logs.
- Two-way synchronization with repository `SKILL.md`, `skills.md`, and `AGENTS.md` using Detect → Compare → Preview → Merge → Sync without overwriting user instructions.

### 2.6 SDLC Management, Cloud Execution & Live Preview
- 8-phase SDLC tracker: Discovery, Planning, Development, Testing, Review, Integration, Deployment, Monitoring.
- Cloud Execution Engine backed by GitHub Actions / Vercel / Supabase Edge Functions with real job status, stdout/stderr logs, exit codes, and artifacts.
- Integrated Live Preview workspace with Desktop/Tablet/Mobile viewports, real Vercel preview URL iframe, build status, and AI error-fix trigger.

## 3. Non-Functional Requirements
- **Security:** AES-256-GCM credential encryption, Supabase RLS on all tenant tables, strict agent tool permissions, human-in-the-loop approval for production merges/deployments/DB mutations, SSRF & webhook signature checks, secret redaction in logs.
- **Reliability:** Durable DB-persisted orchestration state, idempotency keys, exponential backoff retries, graceful degradation when external credentials are not yet configured.
- **UI/UX:** Dark-mode first (`#09090B` background, `#111114` surface, `#8B5CF6` primary, `#06B6D4` accent), light mode support, resizable panels, Monaco Editor, xterm.js terminal, responsive layout.
