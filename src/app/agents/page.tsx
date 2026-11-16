"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/primitives";
import { Bot, Shield, Sparkles } from "lucide-react";
import type { AgentDefinition } from "@/types";

interface AgentWithStats extends AgentDefinition {
  executionsCount: number;
  totalTokens: number;
}

export default function AgentsPage() {
  const { data } = useQuery<{ agents: AgentWithStats[] }>({
    queryKey: ["agents"],
    queryFn: () => fetch("/api/agents").then((r) => r.json()),
  });

  const agents = data?.agents ?? [];
  const [selectedId, setSelectedId] = useState<string>("orchestrator");
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#8B5CF6]" /> Built-in AI Agents
          </h1>
          <p className="text-xs text-[var(--fg-muted)]">
            Four specialized engineering agents + the RemoteChat Agent Orchestrator with strict permission boundaries.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                  selected?.id === agent.id
                    ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{agent.name}</span>
                  <span className="font-mono text-xs text-[#06B6D4]">{agent.mention}</span>
                </div>
                <div className="text-xs text-[var(--fg-muted)] mt-1">{agent.role}</div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--fg-muted)]">
                  <span>{agent.executionsCount} runs</span>
                  <span>{agent.totalTokens.toLocaleString()} tokens</span>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <Card className="lg:col-span-2 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {selected.role} • Invoke in chat with{" "}
                    <code className="text-[#8B5CF6]">{selected.mention}</code>
                  </p>
                </div>
                <span className="rounded-full bg-[#22C55E]/15 px-2.5 py-1 text-xs text-[#22C55E]">
                  Built-in
                </span>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5 mb-2">
                  <Shield className="h-3.5 w-3.5 text-[#06B6D4]" /> Enforced Tool Permissions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selected.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[11px]"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" /> System Instructions
                </h3>
                <pre className="whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs font-mono leading-relaxed max-h-80 overflow-y-auto">
                  {selected.systemInstructions}
                </pre>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
