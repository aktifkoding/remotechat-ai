"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, StatusPill } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet, Wand2 } from "lucide-react";

export function LivePreviewPanel({
  vercelProjectId,
  customPreviewUrl,
  onAskAiFix,
}: {
  vercelProjectId?: string | null;
  customPreviewUrl?: string | null;
  onAskAiFix: (errorSummary: string) => void;
}) {
  const { previewDevice, setPreviewDevice } = useWorkspaceStore();
  const [iframeKey, setIframeKey] = useState(0);

  const { data, refetch, isFetching } = useQuery<{
    connection: { accountLabel: string } | null;
    deployments: Array<{
      uid: string;
      name: string;
      url: string;
      state: string;
      createdAt: number;
    }>;
  }>({
    queryKey: ["vercel-preview", vercelProjectId],
    queryFn: () =>
      fetch(
        `/api/integrations/vercel${vercelProjectId ? `?projectId=${encodeURIComponent(vercelProjectId)}` : ""}`
      ).then((r) => r.json()),
  });

  const latest = data?.deployments?.[0];
  const previewUrl = customPreviewUrl || (latest?.url ? `https://${latest.url}` : null);
  const status = latest?.state ?? (data?.connection ? "READY" : "pending");

  const widthClass =
    previewDevice === "mobile"
      ? "w-[375px]"
      : previewDevice === "tablet"
      ? "w-[768px]"
      : "w-full";

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      {/* Preview Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold">Live Preview</span>
          <StatusPill status={status} />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPreviewDevice("desktop")}
            className={`p-1.5 rounded cursor-pointer ${previewDevice === "desktop" ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "text-[var(--fg-muted)]"}`}
            title="Desktop View"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setPreviewDevice("tablet")}
            className={`p-1.5 rounded cursor-pointer ${previewDevice === "tablet" ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "text-[var(--fg-muted)]"}`}
            title="Tablet View"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setPreviewDevice("mobile")}
            className={`p-1.5 rounded cursor-pointer ${previewDevice === "mobile" ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "text-[var(--fg-muted)]"}`}
            title="Mobile View"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setIframeKey((k) => k + 1);
              refetch();
            }}
            className="p-1.5 rounded text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
            title="Refresh Preview"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded text-[var(--fg-muted)] hover:text-[var(--fg)]"
              title="Open External"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Preview Body */}
      <div className="flex-1 overflow-auto flex justify-center bg-[#09090B] p-3">
        {!previewUrl ? (
          <div className="flex flex-col items-center justify-center text-center max-w-xs space-y-2 text-xs text-[var(--fg-muted)]">
            <p className="font-medium text-[var(--fg)]">No Vercel Preview Deployment Yet</p>
            <p>
              Connect Vercel in Integrations and link a project to display real Preview Deployments here.
            </p>
          </div>
        ) : status === "ERROR" ? (
          <div className="flex flex-col items-center justify-center text-center max-w-sm space-y-3 text-xs">
            <p className="text-[#EF4444] font-semibold">Vercel Deployment Failed</p>
            <p className="text-[var(--fg-muted)]">Deployment {latest?.uid} encountered a build error.</p>
            <Button
              size="sm"
              onClick={() => onAskAiFix(`@developer Analyze and fix Vercel build error for deployment ${latest?.uid}`)}
            >
              <Wand2 className="h-3.5 w-3.5" /> Ask AI to Fix Build Error
            </Button>
          </div>
        ) : status === "BUILDING" || status === "QUEUED" || status === "INITIALIZING" ? (
          <div className="flex flex-col items-center justify-center text-center space-y-2 text-xs text-[#06B6D4]">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Building Vercel Preview Deployment...</span>
          </div>
        ) : (
          <iframe
            key={iframeKey}
            src={previewUrl}
            title="Vercel Live Preview"
            className={`h-full ${widthClass} rounded-lg border border-[var(--border)] bg-white transition-all`}
          />
        )}
      </div>
    </div>
  );
}
