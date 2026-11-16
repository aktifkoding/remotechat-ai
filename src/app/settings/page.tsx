"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/primitives";
import { ShieldCheck, Settings } from "lucide-react";

export default function SettingsPage() {
  const { data } = useQuery<{
    auditLogs: Array<{
      id: string;
      actorType: string;
      action: string;
      resourceType: string;
      createdAt: string;
    }>;
  }>({
    queryKey: ["audit-logs"],
    queryFn: () => fetch("/api/audit").then((r) => r.json()),
  });

  const logs = data?.auditLogs ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#8B5CF6]" /> Workspace & Security Settings
          </h1>
          <p className="text-xs text-[var(--fg-muted)]">
            Tenant isolation, AES-256-GCM credential vault, and immutable security audit trail.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-semibold">Workspace Configuration</h2>
            <div className="text-xs space-y-2 text-[var(--fg-muted)]">
              <div>Workspace: <strong className="text-[var(--fg)]">Default Engineering Workspace</strong></div>
              <div>Isolation: <strong className="text-[#22C55E]">Row Level Security (RLS) Enabled</strong></div>
              <div>Credential Storage: <strong className="text-[#22C55E]">AES-256-GCM Server Vault</strong></div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#22C55E]" /> Security Controls
            </h2>
            <ul className="text-xs space-y-1.5 text-[var(--fg-muted)]">
              <li>• API Keys & OAuth tokens never stored in localStorage</li>
              <li>• SSRF protection active on custom AI Base URLs</li>
              <li>• Webhook HMAC-SHA256 signature verification</li>
              <li>• Human approval required for production deploys & migrations</li>
            </ul>
          </Card>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold">Security Audit Trail ({logs.length})</h2>
          {logs.length === 0 ? (
            <p className="text-xs text-[var(--fg-muted)]">No audit events recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                >
                  <span className="font-mono">
                    [{l.actorType}] {l.action} ({l.resourceType})
                  </span>
                  <span className="text-[var(--fg-muted)]">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
