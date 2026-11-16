"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button, Card, Input, StatusPill } from "@/components/ui/primitives";
import { CheckCircle2, Cpu, KeyRound, Plus, ShieldCheck, Trash2, Zap } from "lucide-react";
import type { AiProviderPublic } from "@/types";

export default function AiProvidersPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("Custom OpenAI Compatible");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("gpt-4o-mini");
  const [contextWindow, setContextWindow] = useState(128000);
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [temperature, setTemperature] = useState(0.2);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const { data } = useQuery<{
    providers: AiProviderPublic[];
    usageLogs: Array<{
      id: string;
      model: string;
      agentId: string;
      totalTokens: number;
      estimatedCostUsd: number;
      latencyMs: number;
      createdAt: string;
    }>;
  }>({
    queryKey: ["ai-providers"],
    queryFn: () => fetch("/api/ai-providers").then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          providerType: "openai_compatible",
          baseUrl,
          apiKey,
          defaultModel,
          isDefault: true,
          contextWindow,
          maxOutputTokens,
          temperature,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json.error));
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
      setApiKey("");
      setTestResult({ ok: true, msg: "Provider encrypted & saved on server." });
    },
    onError: (err) => {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : "Save failed" });
    },
  });

  const testDirectMutation = useMutation({
    mutationFn: async (payload: { providerId?: string }) => {
      const res = await fetch("/api/ai-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload.providerId
            ? { providerId: payload.providerId }
            : { baseUrl, apiKey, model: defaultModel }
        ),
      });
      return res.json() as Promise<{ ok: boolean; reply?: string; error?: string; latencyMs?: number }>;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
      setTestResult({
        ok: res.ok,
        msg: res.ok
          ? `Connected (${res.latencyMs}ms): "${res.reply}"`
          : res.error ?? "Connection test failed",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/ai-providers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-providers"] }),
  });

  const providers = data?.providers ?? [];
  const usageLogs = data?.usageLogs ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[#8B5CF6]" /> AI Provider Settings
            </h1>
            <p className="text-xs text-[var(--fg-muted)]">
              Configure OpenAI-compatible endpoints. API keys are AES-256-GCM encrypted server-side and never exposed to the browser.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-1.5 text-xs text-[#22C55E]">
            <ShieldCheck className="h-4 w-4" /> Server-Side Secret Vault
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Add Provider Form */}
          <Card className="lg:col-span-2 p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#8B5CF6]" /> Add AI Provider
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--fg-muted)]">Provider Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[var(--fg-muted)]">Base URL</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-ai-provider.com/v1"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--fg-muted)]">API Key (Encrypted on Server)</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="text-xs text-[var(--fg-muted)]">Model Name</label>
                <Input
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="gpt-4o / claude-3-7-sonnet / deepseek-chat"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[var(--fg-muted)]">Context</label>
                  <Input
                    type="number"
                    value={contextWindow}
                    onChange={(e) => setContextWindow(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--fg-muted)]">Max Tokens</label>
                  <Input
                    type="number"
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--fg-muted)]">Temp</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {testResult && (
              <div
                className={`rounded-lg border p-2.5 text-xs ${
                  testResult.ok
                    ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
                    : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
                }`}
              >
                {testResult.msg}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={!baseUrl || !apiKey || !defaultModel || testDirectMutation.isPending}
                onClick={() => testDirectMutation.mutate({})}
              >
                <Zap className="h-3.5 w-3.5" />
                {testDirectMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!name || !baseUrl || !apiKey || !defaultModel || addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                Save Provider
              </Button>
            </div>
          </Card>

          {/* Configured Providers & Usage */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="p-5 space-y-4">
              <h2 className="text-sm font-semibold">Configured Providers ({providers.length})</h2>
              {providers.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)] py-6 text-center">
                  No AI providers configured yet. Add your OpenAI-compatible Base URL and API key on the left.
                </p>
              ) : (
                <div className="space-y-3">
                  {providers.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{p.name}</span>
                          {p.isDefault && (
                            <span className="rounded bg-[#8B5CF6]/20 px-1.5 py-0.5 text-[10px] text-[#8B5CF6]">
                              Default
                            </span>
                          )}
                          <StatusPill status={p.status} />
                        </div>
                        <div className="text-xs text-[var(--fg-muted)] font-mono truncate">
                          {p.baseUrl} • {p.defaultModel}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
                          <KeyRound className="h-3 w-3" /> {p.maskedApiKey}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => testDirectMutation.mutate({ providerId: p.id })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(p.id)}
                          aria-label="Delete provider"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[#EF4444]" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <h2 className="text-sm font-semibold">Recent Token & Cost Analytics</h2>
              {usageLogs.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">No AI requests recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {usageLogs.slice(0, 10).map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                    >
                      <span className="font-mono">
                        @{u.agentId} • {u.model}
                      </span>
                      <span className="text-[var(--fg-muted)]">
                        {u.totalTokens} tok • \${u.estimatedCostUsd.toFixed(5)} • {u.latencyMs}ms
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
