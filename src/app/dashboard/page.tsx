"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button, Card, Input, StatusPill } from "@/components/ui/primitives";
import {
  Activity,
  Bot,
  Cpu,
  FolderGit2,
  GitBranch,
  Layers,
  Plus,
  Rocket,
  TerminalSquare,
} from "lucide-react";
import type { AiProviderPublic, OrchestrationRun, Project } from "@/types";

export default function DashboardPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("Next.js 15 + TypeScript");
  const [description, setDescription] = useState("");

  const { data: projectsData } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const { data: providersData } = useQuery<{
    providers: AiProviderPublic[];
    usageLogs: Array<{ totalTokens: number; estimatedCostUsd: number }>;
  }>({
    queryKey: ["ai-providers"],
    queryFn: () => fetch("/api/ai-providers").then((r) => r.json()),
  });

  const { data: runsData } = useQuery<{ runs: OrchestrationRun[] }>({
    queryKey: ["orchestrator-runs"],
    queryFn: () => fetch("/api/orchestrator/runs").then((r) => r.json()),
  });

  const { data: ghData } = useQuery<{ connection: { accountLabel: string; status: string } | null }>({
    queryKey: ["integration-github"],
    queryFn: () => fetch("/api/integrations/github").then((r) => r.json()),
  });

  const { data: vercelData } = useQuery<{
    connection: { accountLabel: string; status: string } | null;
    deployments: Array<{ uid: string; name: string; state: string; url: string }>;
  }>({
    queryKey: ["integration-vercel"],
    queryFn: () => fetch("/api/integrations/vercel").then((r) => r.json()),
  });

  const { data: sbData } = useQuery<{ connection: { accountLabel: string; status: string } | null }>({
    queryKey: ["integration-supabase"],
    queryFn: () => fetch("/api/integrations/supabase").then((r) => r.json()),
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, framework, description }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setName("");
      setDescription("");
      setShowCreate(false);
    },
  });

  const projects = projectsData?.projects ?? [];
  const providers = providersData?.providers ?? [];
  const runs = runsData?.runs ?? [];
  const totalTokens = (providersData?.usageLogs ?? []).reduce((a, b) => a + b.totalTokens, 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">RemoteChat AI Control Center</h1>
            <p className="text-sm text-[var(--fg-muted)]">
              Your Entire Development Team. One Remote Workspace.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/ai-providers">
              <Button variant="secondary" size="sm">
                <Cpu className="h-3.5 w-3.5" /> Configure AI
              </Button>
            </Link>
            <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-3.5 w-3.5" /> New Project
            </Button>
          </div>
        </div>

        {/* New Project Form */}
        {showCreate && (
          <Card className="p-5 space-y-4 border-[#8B5CF6]/40">
            <h2 className="text-sm font-semibold">Create Cloud Project</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Project name (e.g. SaaS Billing)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Framework (e.g. Next.js 15)"
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
              />
              <Input
                placeholder="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!name.trim() || createProject.isPending}
                onClick={() => createProject.mutate()}
              >
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </Card>
        )}

        {/* Top KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
              <span>Active Projects</span>
              <FolderGit2 className="h-4 w-4 text-[#8B5CF6]" />
            </div>
            <div className="text-2xl font-semibold">{projects.length}</div>
            <div className="text-[11px] text-[var(--fg-muted)]">Cloud-synced repositories</div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
              <span>AI Providers</span>
              <Cpu className="h-4 w-4 text-[#06B6D4]" />
            </div>
            <div className="text-2xl font-semibold">{providers.length}</div>
            <div className="text-[11px] text-[var(--fg-muted)]">
              {providers.find((p) => p.isDefault)?.defaultModel ?? "No default model"}
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
              <span>Orchestration Runs</span>
              <Bot className="h-4 w-4 text-[#22C55E]" />
            </div>
            <div className="text-2xl font-semibold">{runs.length}</div>
            <div className="text-[11px] text-[var(--fg-muted)]">Multi-agent SDLC pipelines</div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
              <span>AI Token Usage</span>
              <Activity className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div className="text-2xl font-semibold">{totalTokens.toLocaleString()}</div>
            <div className="text-[11px] text-[var(--fg-muted)]">Tracked across all agents</div>
          </Card>
        </div>

        {/* Projects & Integration Status */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#8B5CF6]" /> Active Projects
              </h2>
              <span className="text-xs text-[var(--fg-muted)]">{projects.length} total</span>
            </div>

            <div className="space-y-2.5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <span className="rounded bg-[#8B5CF6]/15 px-1.5 py-0.5 text-[10px] text-[#8B5CF6]">
                        {p.framework ?? "Web"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                      <span className="flex items-center gap-1 font-mono">
                        <GitBranch className="h-3 w-3" /> {p.activeBranch}
                      </span>
                      {p.githubRepoFullName && <span>{p.githubRepoFullName}</span>}
                    </div>
                  </div>
                  <Link href={`/projects/${p.id}`}>
                    <Button size="sm">
                      <TerminalSquare className="h-3.5 w-3.5" /> Open Workspace
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold">Integration Status</h2>
            <div className="space-y-3">
              {[
                {
                  name: "GitHub",
                  conn: ghData?.connection,
                  desc: "Repositories, PRs & Actions",
                },
                {
                  name: "Supabase",
                  conn: sbData?.connection,
                  desc: "Database, Auth & Migrations",
                },
                {
                  name: "Vercel",
                  conn: vercelData?.connection,
                  desc: "Preview & Production Deploys",
                },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                >
                  <div>
                    <div className="text-xs font-semibold">{item.name}</div>
                    <div className="text-[11px] text-[var(--fg-muted)]">
                      {item.conn ? item.conn.accountLabel : item.desc}
                    </div>
                  </div>
                  <StatusPill
                    status={item.conn ? "connected" : "pending"}
                    label={item.conn ? "Connected" : "Not linked"}
                  />
                </div>
              ))}
            </div>
            <Link href="/integrations" className="block">
              <Button variant="secondary" size="sm" className="w-full">
                Manage Integrations
              </Button>
            </Link>
          </Card>
        </div>

        {/* Recent Agent Activity & Deployments */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#06B6D4]" /> Recent Agent Orchestrations
            </h2>
            {runs.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)] py-6 text-center">
                No orchestration runs yet. Open a Project Workspace and mention{" "}
                <code className="text-[#8B5CF6]">@orchestrator</code> to start.
              </p>
            ) : (
              <div className="space-y-2.5">
                {runs.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-xs font-medium truncate">{r.triggerPrompt}</div>
                      <div className="text-[11px] text-[var(--fg-muted)]">
                        Step {r.currentStep}/{r.tasks.length} • {r.totalTokens} tokens
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Rocket className="h-4 w-4 text-[#22C55E]" /> Recent Vercel Deployments
            </h2>
            {(vercelData?.deployments ?? []).length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)] py-6 text-center">
                Connect Vercel in Integrations to monitor real Preview & Production deployments.
              </p>
            ) : (
              <div className="space-y-2.5">
                {(vercelData?.deployments ?? []).slice(0, 5).map((d) => (
                  <div
                    key={d.uid}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{d.name}</div>
                      <a
                        href={`https://${d.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#06B6D4] hover:underline truncate block"
                      >
                        https://{d.url}
                      </a>
                    </div>
                    <StatusPill status={d.state} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
