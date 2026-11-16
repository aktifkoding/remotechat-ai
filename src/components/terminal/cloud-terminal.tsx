"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import "@xterm/xterm/css/xterm.css";
import { RefreshCw, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export function CloudTerminal({ projectId }: { projectId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);

  const { data, refetch, isFetching } = useQuery<{
    githubActionsRuns: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      head_branch: string;
      created_at: string;
    }>;
  }>({
    queryKey: ["cloud-jobs", projectId],
    queryFn: () => fetch(`/api/execution/jobs?projectId=${projectId}`).then((r) => r.json()),
  });

  useEffect(() => {
    let disposed = false;
    async function init() {
      if (!containerRef.current || termRef.current) return;
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        theme: {
          background: "#09090B",
          foreground: "#E4E4E7",
          cursor: "#8B5CF6",
        },
        fontSize: 12,
        fontFamily: "var(--font-mono), monospace",
        convertEol: true,
        disableStdin: true,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      term.writeln("\x1b[35mRemoteChat Cloud Execution Terminal\x1b[0m");
      term.writeln("Connected to GitHub Actions & Vercel Cloud Runners.\r\n");
      termRef.current = term;
    }
    init();
    return () => {
      disposed = true;
      termRef.current?.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    const term = termRef.current;
    if (!term || !data) return;
    const runs = data.githubActionsRuns ?? [];
    if (runs.length === 0) {
      term.writeln("\x1b[90m[info] No GitHub Actions workflow runs found for this repository.\x1b[0m");
    } else {
      term.writeln(`\x1b[36m[sync] Loaded ${runs.length} GitHub Actions runs:\x1b[0m`);
      for (const r of runs.slice(0, 8)) {
        const color = r.conclusion === "success" ? "\x1b[32m" : r.conclusion === "failure" ? "\x1b[31m" : "\x1b[33m";
        term.writeln(
          `  ${color}[${r.conclusion ?? r.status}]\x1b[0m #${r.id} ${r.name} (${r.head_branch})`
        );
      }
    }
  }, [data]);

  return (
    <div className="flex h-full flex-col bg-[#09090B]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <TerminalSquare className="h-3.5 w-3.5 text-[#06B6D4]" />
          <span>Cloud Execution Logs</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Sync CI
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
}
