# RemoteChat AI

> **"Your Entire Development Team. One Remote Workspace."**

RemoteChat AI is a cloud-based AI software development platform with multi-agent orchestration, built-in engineering skills, real-time GitHub/Supabase/Vercel integrations, custom OpenAI-compatible AI providers, and both **Web** (Next.js App Router) and **Mobile** (Expo / React Native Android & iOS) clients.

---

## Key Features

- **Multi-Agent Orchestrator (`@orchestrator`)**
  - Four specialized built-in engineering agents: **Solution Architect** (`@architect`), **Senior Fullstack Developer** (`@developer`), **QA Engineer** (`@qa`), and **Code Reviewer** (`@reviewer`).
  - Durable state-machine execution with per-agent tool permissions, bounded retries, cancellation, and human-in-the-loop approval gates.
- **Built-in Skills Engine (`remotechat/skills/`)**
  - 20 built-in `SKILL.md` definitions across `core`, `development`, `quality`, `architecture`, and `deployment`, plus two-way GitHub repository sync (`SKILL.md`, `skills.md`, `AGENTS.md`).
- **Real Cloud Integrations**
  - **GitHub:** Repository browser, branch management, file reading/committing, Pull Requests, Commit/PR tracking, and GitHub Actions workflow monitoring.
  - **AI Tool Calling in Chat:** `/api/chat` supports live GitHub tool calling (`read_github_file`, `commit_github_file`, `create_github_branch`, `create_pull_request`).
  - **Supabase:** Project listing, table inspection, versioned PostgreSQL migrations with Row Level Security (RLS), and approval-gated SQL execution.
  - **Vercel:** Project linking, deployment status monitoring, build logs, and embedded Live Preview.
- **Custom AI Provider Vault**
  - Configure any OpenAI-compatible Base URL, API Key, and Model with server-side **AES-256-GCM** encryption, key masking, SSRF validation, and token/cost analytics.
- **Rich Text AI Chat & Developer Workspace**
  - ChatGPT-style Markdown & Rich Text rendering (headings, bold/italic, lists, blockquotes, syntax-highlighted code blocks, responsive tables, XSS-safe links, and streaming-safe normalization) on both Web and Mobile.
  - **Web IDE:** Resizable 3-pane workspace with File Explorer, Monaco Editor, xterm.js Cloud Terminal, and Live Preview.
  - **Mobile App (`mobile/`):** Native Expo / React Native app with Dashboard, AI Chat, Repo & Git (syntax-highlighted code viewer, Commit & PR tracker), Vercel Live Preview (`WebView`), SDLC tracker, and Settings.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Web Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand, TanStack Query, Monaco Editor, xterm.js, React Resizable Panels |
| **Mobile Client** | Expo SDK 52, React Native, Expo Router, React Native WebView, Expo SecureStore, Lucide Icons |
| **Backend & DB** | Next.js Route Handlers, Supabase (PostgreSQL, Auth, RLS, Realtime, Storage), Zod |
| **Security** | AES-256-GCM credential vault, SSRF URL validator, HMAC webhook verification, secret redaction |
| **Testing** | Vitest, ESLint 9, TypeScript strict mode |

---

## Project Structure

```text
├── docs/                   # SRS, System Architecture & Environment Docs
├── remotechat/
│   ├── agents/             # Built-in agent definitions (architect, developer, qa, reviewer, orchestrator)
│   └── skills/             # 20 built-in SKILL.md definitions across 5 categories
├── supabase/
│   └── migrations/         # Versioned PostgreSQL + RLS schema
├── src/
│   ├── app/                # Next.js App Router pages & /api/* route handlers
│   ├── components/         # UI primitives, Rich Text renderer, Monaco, xterm, Live Preview
│   ├── lib/                # Encryption, security (SSRF, webhook, rate-limit), Markdown & validators
│   ├── modules/            # AI client, GitHub, Vercel, Supabase, Orchestrator, Skills Engine
│   └── server/             # Server-side encrypted repository & state management
└── mobile/                 # Expo / React Native mobile application (Android & iOS)
```

---

## Quick Start

### 1. Web & Backend Server

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000` in your browser.

For production mode:

```bash
pnpm build
pnpm start
```

### 2. Mobile App (Expo / React Native)

```bash
cd mobile
pnpm install
pnpm start
```

In the mobile app's **Settings** tab, set **RemoteChat Server URL** to your backend URL (e.g., `http://192.168.x.x:3000` on local Wi-Fi or your deployed `https://...vercel.app` URL).

---

## Verification

```bash
pnpm lint
pnpm test
pnpm typecheck
cd mobile && pnpm typecheck
```

---

## Documentation

- [Software Requirements Specification (SRS)](docs/SRS.md)
- [System Architecture & ERD](docs/ARCHITECTURE.md)
- [Environment Variables Guide](docs/ENV.md)
- [Initial Database Schema](supabase/migrations/0001_initial_schema.sql)
