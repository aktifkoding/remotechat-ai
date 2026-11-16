"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button, Card, StatusPill } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Check, GitPullRequest, ShieldAlert, X } from "lucide-react";
import type { ApprovalRequest, OrchestrationRun, SdlcPhaseRecord } from "@/types";

export default function WorkflowsPage() {
  const qc = useQueryClient();
  const { activeProjectId } = useWorkspaceStore();

  const { data: sdlcData } = useQuery<{
    phases: SdlcPhaseRecord[];
    approvals: ApprovalRequest[];
  }>({
    queryKey: ["sdlc", activeProjectId],
    queryFn: () => fetch(`/api/sdlc?projectId=${activeProjectId}`).then((r) => r.json()),
  });

  const { data: runsData } = useQuery<{ runs: OrchestrationRun[] }>({
    queryKey: ["orchestrator-runs", activeProjectId],
    queryFn: () => fetch(`/api/orchestrator/runs?projectId=${activeProjectId}`).then((r) => r.json()),
  });

  const decideMutation = useMutation({
    mutationFn: async (params: { approvalId: string; decision: "approved" | "rejected" }) => {
      const res = await fetch("/api/sdlc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sdlc", activeProjectId] }),
  });

  const phases = sdlcData?.phases ?? [];
  const approvals = sdlcData?.approvals ?? [];
  const runs = runsData?.runs ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-[#8B5CF6]" /> SDLC Management Dashboard
          </h1>
          <p className="text-xs text-[var(--fg-muted)]">
            8-Phase Software Development Lifecycle tracker, approval gates, and multi-agent orchestration runs.
          </p>
        </div>

        {/* 8-Phase SDLC Board */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {phases.map((phase) => (
            <Card key={phase.phaseKey} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold capitalize">
                  {phase.phaseOrder}. {phase.phaseKey}
                </span>
                <StatusPill status={phase.status} />
              </div>
              <div className="text-[11px] text-[var(--fg-muted)]">
                Owner: <code className="text-[#06B6D4]">@{phase.responsibleAgent}</code>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] transition-all"
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Approval Queue */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#F59E0B]" /> Human Approval Gates ({approvals.length})
          </h2>
          {approvals.length === 0 ? (
            <p className="text-xs text-[var(--fg-muted)]">
              No pending approvals. High-risk actions (production merge, DB migration, production deploy) appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {approvals.map((apr) => (
                <div
                  key={apr.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{apr.title}</span>
                      <StatusPill status={apr.status} />
                    </div>
                    <p className="text-xs text-[var(--fg-muted)]">{apr.description}</p>
                  </div>
                  {apr.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => decideMutation.mutate({ approvalId: apr.id, decision: "approved" })}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => decideMutation.mutate({ approvalId: apr.id, decision: "rejected" })}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Orchestration Runs */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold">Orchestration Runs ({runs.length})</h2>
          {runs.length === 0 ? (
            <p className="text-xs text-[var(--fg-muted)]">No orchestration runs recorded for this project yet.</p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{run.triggerPrompt}</div>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {run.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs space-y-1"
                      >
                        <div className="font-mono text-[#06B6D4]">@{t.agentId}</div>
                        <div className="truncate text-[11px]">{t.title}</div>
                        <StatusPill status={t.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
