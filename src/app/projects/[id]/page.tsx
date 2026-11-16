"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { AppShell } from "@/components/layout/app-shell";
import { Button, StatusPill } from "@/components/ui/primitives";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { MonacoPanel } from "@/components/editor/monaco-panel";
import { CloudTerminal } from "@/components/terminal/cloud-terminal";
import { LivePreviewPanel } from "@/components/preview/live-preview-panel";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  Bot,
  Code2,
  FileCode2,
  Folder,
  MessageSquare,
  Play,
  Send,
  TerminalSquare,
} from "lucide-react";
import type { ChatMessage, OrchestrationRun, Project } from "@/types";

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const qc = useQueryClient();
  const {
    centerTab,
    setCenterTab,
    activeBranch,
    setActiveBranch,
    selectedFilePath,
    setSelectedFilePath,
  } = useWorkspaceStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      agentId: "orchestrator",
      content:
        "Welcome to **RemoteChat AI Workspace**. Mention `@orchestrator`, `@architect`, `@developer`, `@qa`, or `@reviewer` to begin.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileSha, setFileSha] = useState<string | undefined>(undefined);
  const [activeRun, setActiveRun] = useState<OrchestrationRun | null>(null);

  const { data: projectsData } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const project = projectsData?.projects.find((p) => p.id === projectId) ?? projectsData?.projects[0];

  const { data: ghData } = useQuery<{
    connection: { accountLabel: string } | null;
    repositories: Array<{ id: number; full_name: string; default_branch: string }>;
  }>({
    queryKey: ["integration-github"],
    queryFn: () => fetch("/api/integrations/github").then((r) => r.json()),
  });

  const { data: treeData } = useQuery<{
    branches: Array<{ name: string }>;
    tree: Array<{ path: string; type: "blob" | "tree" }>;
  }>({
    queryKey: ["github-tree", project?.githubRepoFullName, activeBranch],
    enabled: Boolean(project?.githubRepoFullName),
    queryFn: () =>
      fetch(
        `/api/integrations/github/repo?repo=${encodeURIComponent(
          project?.githubRepoFullName ?? ""
        )}&branch=${encodeURIComponent(activeBranch)}`
      ).then((r) => r.json()),
  });

  const linkRepoMutation = useMutation({
    mutationFn: async (githubRepoFullName: string) => {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, githubRepoFullName }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const openFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await fetch(
        `/api/integrations/github/repo?repo=${encodeURIComponent(
          project?.githubRepoFullName ?? ""
        )}&branch=${encodeURIComponent(activeBranch)}&path=${encodeURIComponent(filePath)}`
      );
      if (!res.ok) throw new Error("Failed to load file");
      return res.json() as Promise<{ file: { path: string; content: string; sha: string } }>;
    },
    onSuccess: (res) => {
      setSelectedFilePath(res.file.path);
      setFileContent(res.file.content);
      setFileSha(res.file.sha);
      setCenterTab("editor");
    },
  });

  const commitFileMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch("/api/integrations/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit_file",
          repo: project?.githubRepoFullName,
          branch: activeBranch,
          path: selectedFilePath,
          content: fileContent,
          sha: fileSha,
          message,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Commit failed");
      return json;
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: text,
          branch: activeBranch,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Chat failed");
      return json as {
        agentId: ChatMessage["agentId"];
        reply: string;
        tokensUsed?: number;
        orchestrationRun?: OrchestrationRun;
      };
    },
    onSuccess: (res) => {
      if (res.orchestrationRun) {
        setActiveRun(res.orchestrationRun);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          agentId: res.agentId,
          content: res.reply,
          tokensUsed: res.tokensUsed,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          agentId: "orchestrator",
          content: `**Error:** ${err instanceof Error ? err.message : "Request failed"}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
  });

  const stepRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/orchestrator/runs/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "step" }),
      });
      return res.json() as Promise<{ run: OrchestrationRun }>;
    },
    onSuccess: ({ run }) => {
      setActiveRun(run);
      const lastCompleted = [...run.tasks].reverse().find((t) => t.status === "completed");
      if (lastCompleted?.outputSummary) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-step-${Date.now()}`,
            role: "assistant",
            agentId: lastCompleted.agentId,
            content: `**Step ${lastCompleted.stepOrder} (@${lastCompleted.agentId}):** ${lastCompleted.title}\n\n${lastCompleted.outputSummary}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    },
  });

  function sendPrompt(customText?: string) {
    const text = (customText ?? prompt).trim();
    if (!text || chatMutation.isPending) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    if (!customText) setPrompt("");
    chatMutation.mutate(text);
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* LEFT PANE: File Explorer & Agent Progress */}
          <Panel defaultSize={22} minSize={16} className="border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
            <div className="p-3 border-b border-[var(--border)] space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                Repository
              </div>
              {ghData?.repositories && ghData.repositories.length > 0 ? (
                <select
                  value={project?.githubRepoFullName ?? ""}
                  onChange={(e) => linkRepoMutation.mutate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-xs"
                >
                  <option value="">Select GitHub repository...</option>
                  {ghData.repositories.map((r) => (
                    <option key={r.id} value={r.full_name}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <Link href="/integrations" className="text-xs text-[#8B5CF6] hover:underline block">
                  Connect GitHub to browse files →
                </Link>
              )}

              {treeData?.branches && treeData.branches.length > 0 && (
                <select
                  value={activeBranch}
                  onChange={(e) => setActiveBranch(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[11px] font-mono"
                >
                  {treeData.branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      branch: {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {(treeData?.tree ?? []).slice(0, 100).map((item) => (
                <button
                  key={item.path}
                  onClick={() => item.type === "blob" && openFileMutation.mutate(item.path)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs truncate cursor-pointer ${
                    selectedFilePath === item.path
                      ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                  }`}
                >
                  {item.type === "tree" ? (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-[#06B6D4]" />
                  ) : (
                    <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate font-mono text-[11px]">{item.path}</span>
                </button>
              ))}
            </div>

            {/* Active Orchestration Progress */}
            {activeRun && (
              <div className="border-t border-[var(--border)] p-3 space-y-2 bg-[var(--surface-2)]">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-[#8B5CF6]" /> Pipeline
                  </span>
                  <StatusPill status={activeRun.status} />
                </div>
                <div className="space-y-1">
                  {activeRun.tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-[11px]">
                      <span className="truncate font-mono">@{t.agentId}</span>
                      <span className="text-[var(--fg-muted)]">{t.status}</span>
                    </div>
                  ))}
                </div>
                {activeRun.status === "in_progress" && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={stepRunMutation.isPending}
                    onClick={() => stepRunMutation.mutate(activeRun.id)}
                  >
                    <Play className="h-3 w-3" />
                    {stepRunMutation.isPending ? "Running Step..." : "Run Next Agent Step"}
                  </Button>
                )}
              </div>
            )}
          </Panel>

          <PanelResizeHandle className="w-1 bg-[var(--border)] hover:bg-[#8B5CF6] transition-colors" />

          {/* CENTER PANE: Chat / Monaco Editor / Cloud Terminal */}
          <Panel defaultSize={48} minSize={30} className="flex flex-col bg-[var(--bg)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCenterTab("chat")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    centerTab === "chat"
                      ? "bg-[#8B5CF6]/15 text-[#8B5CF6]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Chat Workspace
                </button>
                <button
                  onClick={() => setCenterTab("editor")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    centerTab === "editor"
                      ? "bg-[#8B5CF6]/15 text-[#8B5CF6]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" /> Code Editor
                </button>
                <button
                  onClick={() => setCenterTab("terminal")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    centerTab === "terminal"
                      ? "bg-[#8B5CF6]/15 text-[#8B5CF6]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <TerminalSquare className="h-3.5 w-3.5" /> Cloud Terminal
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {centerTab === "chat" && (
                <div className="flex h-full flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
                          m.role === "user"
                            ? "ml-8 border-[#8B5CF6]/30 bg-[#8B5CF6]/10"
                            : "mr-4 border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
                          <span className="font-mono font-semibold text-[#06B6D4]">
                            {m.role === "user" ? "You" : `@${m.agentId ?? "assistant"}`}
                          </span>
                          {m.tokensUsed ? <span>{m.tokensUsed} tokens</span> : null}
                        </div>
                        <MarkdownRenderer content={m.content} />
                      </div>
                    ))}
                  </div>

                  {/* Prompt Bar */}
                  <div className="border-t border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {["@orchestrator", "@architect", "@developer", "@qa", "@reviewer"].map((mention) => (
                        <button
                          key={mention}
                          type="button"
                          onClick={() => setPrompt((p) => (p.startsWith(mention) ? p : `${mention} ${p}`))}
                          className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[11px] text-[#06B6D4] hover:border-[#8B5CF6] cursor-pointer"
                        >
                          {mention}
                        </button>
                      ))}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendPrompt();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask @orchestrator to design, build, test, review, and deploy..."
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                      />
                      <Button type="submit" size="sm" disabled={!prompt.trim() || chatMutation.isPending}>
                        <Send className="h-3.5 w-3.5" />
                        {chatMutation.isPending ? "Running..." : "Send"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              {centerTab === "editor" && (
                <MonacoPanel
                  filePath={selectedFilePath}
                  content={fileContent}
                  onChange={setFileContent}
                  onCommit={(msg) => commitFileMutation.mutate(msg)}
                  committing={commitFileMutation.isPending}
                />
              )}

              {centerTab === "terminal" && <CloudTerminal projectId={projectId} />}
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-[var(--border)] hover:bg-[#8B5CF6] transition-colors" />

          {/* RIGHT PANE: Live Preview */}
          <Panel defaultSize={30} minSize={20} className="border-l border-[var(--border)]">
            <LivePreviewPanel
              vercelProjectId={project?.vercelProjectId}
              customPreviewUrl={project?.vercelPreviewUrl}
              onAskAiFix={(msg) => {
                setCenterTab("chat");
                sendPrompt(msg);
              }}
            />
          </Panel>
        </PanelGroup>
      </div>
    </AppShell>
  );
}
