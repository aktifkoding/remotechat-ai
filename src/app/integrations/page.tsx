"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button, Card, Input, StatusPill } from "@/components/ui/primitives";
import { Database, Github, Plug, Rocket, Unplug } from "lucide-react";

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const [ghToken, setGhToken] = useState("");
  const [sbToken, setSbToken] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const ghQuery = useQuery<{
    connection: { accountLabel: string; maskedToken: string; status: string } | null;
    repositories: Array<{ id: number; full_name: string; default_branch: string; private: boolean }>;
  }>({
    queryKey: ["integration-github"],
    queryFn: () => fetch("/api/integrations/github").then((r) => r.json()),
  });

  const sbQuery = useQuery<{
    connection: { accountLabel: string; maskedToken: string; status: string } | null;
    projects: Array<{ id: string; name: string; region: string; status: string }>;
  }>({
    queryKey: ["integration-supabase"],
    queryFn: () => fetch("/api/integrations/supabase").then((r) => r.json()),
  });

  const vercelQuery = useQuery<{
    connection: { accountLabel: string; maskedToken: string; status: string } | null;
    projects: Array<{ id: string; name: string; framework: string | null }>;
  }>({
    queryKey: ["integration-vercel"],
    queryFn: () => fetch("/api/integrations/vercel").then((r) => r.json()),
  });

  const connectMutation = useMutation({
    mutationFn: async (params: { provider: "github" | "supabase" | "vercel"; token?: string; action?: "disconnect" }) => {
      const res = await fetch(`/api/integrations/${params.provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params.action ? { action: params.action } : { token: params.token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Connection failed");
      return json;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [`integration-${vars.provider}`] });
      setFeedback(`${vars.provider.toUpperCase()} updated successfully.`);
      if (vars.provider === "github") setGhToken("");
      if (vars.provider === "supabase") setSbToken("");
      if (vars.provider === "vercel") setVercelToken("");
    },
    onError: (err) => setFeedback(err instanceof Error ? err.message : "Error"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Plug className="h-5 w-5 text-[#06B6D4]" /> Cloud Integrations
          </h1>
          <p className="text-xs text-[var(--fg-muted)]">
            Connect GitHub (source of truth), Supabase (backend & DB), and Vercel (preview & production hosting). All tokens are encrypted server-side.
          </p>
        </div>

        {feedback && (
          <div className="rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-2.5 text-xs">
            {feedback}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* GitHub */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Github className="h-5 w-5" /> GitHub
              </div>
              <StatusPill
                status={ghQuery.data?.connection ? "connected" : "pending"}
                label={ghQuery.data?.connection ? "Connected" : "Disconnected"}
              />
            </div>
            {ghQuery.data?.connection ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-[var(--surface-2)] p-3 border border-[var(--border)]">
                  <div>Account: <strong>{ghQuery.data.connection.accountLabel}</strong></div>
                  <div className="text-[var(--fg-muted)] font-mono mt-1">{ghQuery.data.connection.maskedToken}</div>
                  <div className="text-[var(--fg-muted)] mt-1">
                    {ghQuery.data.repositories.length} repositories accessible
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => connectMutation.mutate({ provider: "github", action: "disconnect" })}
                >
                  <Unplug className="h-3.5 w-3.5" /> Disconnect GitHub
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="GitHub PAT (ghp_... or github_pat_...)"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!ghToken || connectMutation.isPending}
                  onClick={() => connectMutation.mutate({ provider: "github", token: ghToken })}
                >
                  Connect GitHub
                </Button>
              </div>
            )}
          </Card>

          {/* Supabase */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Database className="h-5 w-5 text-[#22C55E]" /> Supabase
              </div>
              <StatusPill
                status={sbQuery.data?.connection ? "connected" : "pending"}
                label={sbQuery.data?.connection ? "Connected" : "Disconnected"}
              />
            </div>
            {sbQuery.data?.connection ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-[var(--surface-2)] p-3 border border-[var(--border)]">
                  <div>{sbQuery.data.connection.accountLabel}</div>
                  <div className="text-[var(--fg-muted)] font-mono mt-1">{sbQuery.data.connection.maskedToken}</div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => connectMutation.mutate({ provider: "supabase", action: "disconnect" })}
                >
                  <Unplug className="h-3.5 w-3.5" /> Disconnect Supabase
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Supabase Management Token (sbp_...)"
                  value={sbToken}
                  onChange={(e) => setSbToken(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!sbToken || connectMutation.isPending}
                  onClick={() => connectMutation.mutate({ provider: "supabase", token: sbToken })}
                >
                  Connect Supabase
                </Button>
              </div>
            )}
          </Card>

          {/* Vercel */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Rocket className="h-5 w-5 text-white" /> Vercel
              </div>
              <StatusPill
                status={vercelQuery.data?.connection ? "connected" : "pending"}
                label={vercelQuery.data?.connection ? "Connected" : "Disconnected"}
              />
            </div>
            {vercelQuery.data?.connection ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-[var(--surface-2)] p-3 border border-[var(--border)]">
                  <div>User: <strong>{vercelQuery.data.connection.accountLabel}</strong></div>
                  <div className="text-[var(--fg-muted)] font-mono mt-1">{vercelQuery.data.connection.maskedToken}</div>
                  <div className="text-[var(--fg-muted)] mt-1">
                    {vercelQuery.data.projects.length} projects synced
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => connectMutation.mutate({ provider: "vercel", action: "disconnect" })}
                >
                  <Unplug className="h-3.5 w-3.5" /> Disconnect Vercel
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Vercel API Token"
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!vercelToken || connectMutation.isPending}
                  onClick={() => connectMutation.mutate({ provider: "vercel", token: vercelToken })}
                >
                  Connect Vercel
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
