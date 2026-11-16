"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { GitCommitHorizontal } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function detectLanguage(path: string | null): string {
  if (!path) return "typescript";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".sql")) return "sql";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".css")) return "css";
  return "plaintext";
}

export function MonacoPanel({
  filePath,
  content,
  onChange,
  onCommit,
  committing,
}: {
  filePath: string | null;
  content: string;
  onChange: (val: string) => void;
  onCommit: (message: string) => void;
  committing: boolean;
}) {
  const [commitMsg, setCommitMsg] = useState("chore: update via RemoteChat AI");

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--fg-muted)] p-6 text-center">
        Select a file from the GitHub Repository Explorer on the left to inspect and edit it in Monaco Editor.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 gap-2">
        <span className="font-mono text-xs truncate">{filePath}</span>
        <div className="flex items-center gap-2 shrink-0">
          <input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            className="h-7 w-48 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 text-[11px]"
            placeholder="Commit message"
          />
          <Button size="sm" onClick={() => onCommit(commitMsg)} disabled={committing}>
            <GitCommitHorizontal className="h-3.5 w-3.5" />
            {committing ? "Committing..." : "Commit"}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          theme="vs-dark"
          language={detectLanguage(filePath)}
          value={content}
          onChange={(v) => onChange(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "var(--font-mono), monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
