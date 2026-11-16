"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button, Card, Input } from "@/components/ui/primitives";
import { GitCompare, Plus, Sparkles } from "lucide-react";
import type { SkillDefinition } from "@/types";

export default function SkillsPage() {
  const qc = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string>("project-analysis");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMd, setNewMd] = useState("# Custom Skill\n\n## Instructions\nDescribe agent steps here.");
  const [repoToSync, setRepoToSync] = useState("");
  const [syncResults, setSyncResults] = useState<
    Array<{ path: string; status: string; remoteContent: string }>
  >([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data } = useQuery<{ skills: SkillDefinition[] }>({
    queryKey: ["skills"],
    queryFn: () => fetch("/api/skills").then((r) => r.json()),
  });

  const createSkill = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          category: "custom",
          description: newDesc,
          applicableAgents: ["architect", "developer"],
          contentMd: newMd,
        }),
      });
      if (!res.ok) throw new Error("Failed to create skill");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      setNewDesc("");
    },
  });

  const detectRepoSkills = useMutation({
    mutationFn: async () => {
      setSyncError(null);
      const res = await fetch("/api/skills/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect", repoFullName: repoToSync }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      return json.comparisons as Array<{ path: string; status: string; remoteContent: string }>;
    },
    onSuccess: (comparisons) => setSyncResults(comparisons),
    onError: (err) => setSyncError(err instanceof Error ? err.message : "Sync failed"),
  });

  const importRepoSkill = useMutation({
    mutationFn: async (item: { path: string; content: string }) => {
      const res = await fetch("/api/skills/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          repoFullName: repoToSync,
          filePath: item.path,
          content: item.content,
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });

  const skills = data?.skills ?? [];
  const selected = skills.find((s) => s.slug === selectedSlug) ?? skills[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#8B5CF6]" /> RemoteChat Skills Engine
            </h1>
            <p className="text-xs text-[var(--fg-muted)]">
              {skills.length} skills loaded (20 built-in + custom). Two-way sync with repository SKILL.md & AGENTS.md.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> New Custom Skill
          </Button>
        </div>

        {/* Two-Way Repo Sync */}
        <Card className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
              <GitCompare className="h-4 w-4 text-[#06B6D4]" /> Repo Skill Sync
            </div>
            <Input
              placeholder="owner/repo (e.g. acme/saas-app)"
              value={repoToSync}
              onChange={(e) => setRepoToSync(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={!repoToSync || detectRepoSkills.isPending}
              onClick={() => detectRepoSkills.mutate()}
            >
              {detectRepoSkills.isPending ? "Scanning..." : "Detect & Compare"}
            </Button>
          </div>
          {syncError && <div className="text-xs text-[#EF4444]">{syncError}</div>}
          {syncResults.length > 0 && (
            <div className="space-y-2 pt-2">
              {syncResults.map((r) => (
                <div
                  key={r.path}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                >
                  <span className="font-mono">{r.path}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--fg-muted)]">{r.status}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => importRepoSkill.mutate({ path: r.path, content: r.remoteContent })}
                    >
                      Merge to Workspace
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {showCreate && (
          <Card className="p-5 space-y-3 border-[#8B5CF6]/40">
            <h2 className="text-sm font-semibold">Create Custom Skill</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="slug-name" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
              <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <textarea
              className="w-full h-32 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-mono"
              value={newMd}
              onChange={(e) => setNewMd(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createSkill.mutate()}>Save Skill</Button>
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {skills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => setSelectedSlug(skill.slug)}
                className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer ${
                  selected?.slug === skill.slug
                    ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{skill.name}</span>
                  <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--fg-muted)]">
                    {skill.category}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--fg-muted)] line-clamp-2">{skill.description}</p>
              </button>
            ))}
          </div>

          {selected && (
            <Card className="lg:col-span-2 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h2 className="text-base font-semibold">{selected.name}</h2>
                  <p className="text-xs text-[var(--fg-muted)]">{selected.description}</p>
                </div>
                <span className="text-xs font-mono text-[#06B6D4]">v{selected.version}</span>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs font-mono leading-relaxed max-h-[500px] overflow-y-auto">
                {selected.contentMd}
              </pre>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
