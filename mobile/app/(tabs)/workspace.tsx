import React, { Component, type ErrorInfo, type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMobileStore } from "@/stores/mobile-store";
import { COLORS } from "@/theme/colors";
import { MobileMarkdownRenderer } from "@/components/markdown-renderer";
import { CodeViewer } from "@/components/code-viewer";
import {
  ExternalLink,
  FileCode2,
  Folder,
  GitCommitHorizontal,
  GitPullRequest,
  Play,
  RefreshCw,
  Send,
} from "lucide-react-native";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  agentId?: string;
  content: string;
}

interface OrchestrationRun {
  id: string;
  status: string;
  tasks: Array<{
    id: string;
    stepOrder: number;
    agentId: string;
    title: string;
    status: string;
    outputSummary?: string;
  }>;
}

interface ProjectRecord {
  id: string;
  name: string;
  githubRepoFullName?: string | null;
  vercelProjectId?: string | null;
  vercelPreviewUrl?: string | null;
}

interface VercelProject {
  id: string;
  name: string;
  link?: { repo?: string };
  targets?: { production?: { url?: string; alias?: string[] } };
  latestDeployments?: Array<{ url?: string; readyState?: string; alias?: string[] }>;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  createdAt: number;
}

class WorkspaceErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err?.message || "Unexpected workspace error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("WorkspaceErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, styles.centerEmpty]}>
          <Text style={{ color: COLORS.error, fontSize: 15, fontWeight: "700", marginBottom: 8 }}>
            Workspace Error
          </Text>
          <Text style={{ color: COLORS.fgMuted, fontSize: 12, textAlign: "center", marginBottom: 16 }}>
            {this.state.message}
          </Text>
          <Pressable
            style={styles.stepBtn}
            onPress={() => this.setState({ hasError: false, message: "" })}
          >
            <Text style={styles.stepBtnText}>Reload Workspace</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function pickBestVercelDomain(vp?: VercelProject): string | null {
  if (!vp) return null;
  const aliases = [
    ...(vp.targets?.production?.alias ?? []),
    ...(vp.latestDeployments?.[0]?.alias ?? []),
  ].filter(Boolean);

  // Prefer custom domains (not ending in .vercel.app) first
  const customDomain = aliases.find((d) => !d.endsWith(".vercel.app"));
  if (customDomain) return customDomain;

  // Next prefer shortest *.vercel.app production alias (e.g. myapp.vercel.app)
  if (aliases.length > 0) {
    return [...aliases].sort((a, b) => a.length - b.length)[0];
  }

  return vp.targets?.production?.url ?? vp.latestDeployments?.[0]?.url ?? null;
}

export default function MobileWorkspaceScreen() {
  return (
    <WorkspaceErrorBoundary>
      <MobileWorkspaceContent />
    </WorkspaceErrorBoundary>
  );
}

function MobileWorkspaceContent() {
  const qc = useQueryClient();
  const { activeProjectId, activeBranch, serverUrl } = useMobileStore();
  const [tab, setTab] = useState<"chat" | "files" | "preview">("chat");
  const [repoSubTab, setRepoSubTab] = useState<"files" | "commits" | "prs">("files");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      agentId: "orchestrator",
      content:
        "Mobile AI Workspace ready. Tap an **@agent** mention below or type your engineering instruction.",
    },
  ]);
  const [activeRun, setActiveRun] = useState<OrchestrationRun | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [editingPreviewUrl, setEditingPreviewUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [vercelAuthBlocked, setVercelAuthBlocked] = useState(false);
  const [showDeployments, setShowDeployments] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ["mobile-projects", serverUrl],
    queryFn: () => apiFetch<{ projects: ProjectRecord[] }>("/api/projects"),
  });

  const projectsList = Array.isArray(projectsQuery.data?.projects)
    ? projectsQuery.data.projects
    : [];
  const project =
    projectsList.find((p) => p.id === activeProjectId) ?? projectsList[0];

  const ghReposQuery = useQuery({
    queryKey: ["mobile-gh-repos", serverUrl],
    enabled: tab === "files" && !project?.githubRepoFullName,
    queryFn: () =>
      apiFetch<{ repositories: Array<{ id: number; full_name: string; default_branch: string }> }>(
        "/api/integrations/github"
      ),
  });

  const updateProjectMutation = useMutation({
    mutationFn: (patch: {
      githubRepoFullName?: string;
      vercelProjectId?: string;
      vercelPreviewUrl?: string;
    }) =>
      apiFetch("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: project?.id ?? activeProjectId, ...patch }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mobile-projects", serverUrl] }),
  });

  const treeQuery = useQuery({
    queryKey: ["mobile-tree", serverUrl, project?.githubRepoFullName, activeBranch],
    enabled: Boolean(project?.githubRepoFullName) && tab === "files" && repoSubTab === "files",
    queryFn: () =>
      apiFetch<{ tree: Array<{ path: string; type: string }> }>(
        `/api/integrations/github/repo?repo=${encodeURIComponent(
          project?.githubRepoFullName ?? ""
        )}&branch=${encodeURIComponent(activeBranch)}`
      ),
  });

  const activityQuery = useQuery({
    queryKey: ["mobile-gh-activity", serverUrl, project?.githubRepoFullName, activeBranch],
    enabled:
      Boolean(project?.githubRepoFullName) &&
      tab === "files" &&
      (repoSubTab === "commits" || repoSubTab === "prs"),
    queryFn: () =>
      apiFetch<{
        commits: Array<{
          sha: string;
          html_url: string;
          commit: { message: string; author: { name: string; date: string } };
        }>;
        pulls: Array<{
          number: number;
          title: string;
          state: string;
          html_url: string;
          user: { login: string };
          head: { ref: string };
          base: { ref: string };
        }>;
      }>(
        `/api/integrations/github/repo?repo=${encodeURIComponent(
          project?.githubRepoFullName ?? ""
        )}&branch=${encodeURIComponent(activeBranch)}&mode=activity`
      ),
  });

  const vercelQuery = useQuery({
    queryKey: ["mobile-vercel", serverUrl, project?.vercelProjectId],
    enabled: tab === "preview",
    refetchInterval: tab === "preview" ? 8000 : false,
    queryFn: () =>
      apiFetch<{
        connection: { accountLabel: string } | null;
        projects: VercelProject[];
        deployments: VercelDeployment[];
      }>(
        `/api/integrations/vercel${
          project?.vercelProjectId
            ? `?projectId=${encodeURIComponent(project.vercelProjectId)}`
            : ""
        }`
      ),
  });

  const chatMutation = useMutation({
    mutationFn: (text: string) =>
      apiFetch<{
        agentId: string;
        reply: string;
        orchestrationRun?: OrchestrationRun;
        toolCalls?: Array<{ toolName: string; summary: string }>;
      }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          projectId: project?.id ?? activeProjectId,
          message: text,
          branch: activeBranch,
        }),
      }),
    onSuccess: (res) => {
      if (res.orchestrationRun) setActiveRun(res.orchestrationRun);
      if (res.toolCalls && res.toolCalls.length > 0) {
        qc.invalidateQueries({ queryKey: ["mobile-tree"] });
        qc.invalidateQueries({ queryKey: ["mobile-gh-activity"] });
        qc.invalidateQueries({ queryKey: ["mobile-vercel"] });
      }
      const toolSummary =
        res.toolCalls && res.toolCalls.length > 0
          ? `\n\n---\n**GitHub Actions Executed:**\n${res.toolCalls
              .map((t) => `- \`${t.toolName}\`: ${t.summary}`)
              .join("\n")}`
          : "";
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          agentId: res.agentId,
          content: `${res.reply}${toolSummary}`,
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
          content: `**Error:** ${err instanceof Error ? err.message : "Failed"}`,
        },
      ]);
    },
  });

  const stepMutation = useMutation({
    mutationFn: (runId: string) =>
      apiFetch<{ run: OrchestrationRun }>(`/api/orchestrator/runs/${runId}`, {
        method: "POST",
        body: JSON.stringify({ action: "step" }),
      }),
    onSuccess: ({ run }) => {
      setActiveRun(run);
      const last = [...run.tasks].reverse().find((t) => t.status === "completed");
      if (last?.outputSummary) {
        setMessages((prev) => [
          ...prev,
          {
            id: `step-${Date.now()}`,
            role: "assistant",
            agentId: last.agentId,
            content: last.outputSummary!,
          },
        ]);
      }
    },
  });

  async function openFile(path: string) {
    setLoadingFile(true);
    try {
      const res = await apiFetch<{ file: { path: string; content: string } }>(
        `/api/integrations/github/repo?repo=${encodeURIComponent(
          project?.githubRepoFullName ?? ""
        )}&branch=${encodeURIComponent(activeBranch)}&path=${encodeURIComponent(path)}`
      );
      setSelectedFile(res.file);
    } finally {
      setLoadingFile(false);
    }
  }

  function handleSend() {
    const text = prompt.trim();
    if (!text || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: text }]);
    setPrompt("");
    chatMutation.mutate(text);
  }

  const vercelProjects = Array.isArray(vercelQuery.data?.projects)
    ? vercelQuery.data.projects
    : [];
  const vercelDeployments = Array.isArray(vercelQuery.data?.deployments)
    ? vercelQuery.data.deployments
    : [];

  // Resolve Vercel project & domain directly for this repo
  const matchedVercelProject =
    vercelProjects.find((vp) => vp.id === project?.vercelProjectId) ??
    vercelProjects.find(
      (vp) =>
        project?.githubRepoFullName &&
        vp.link?.repo?.toLowerCase() === project.githubRepoFullName.toLowerCase()
    );

  const productionDomain = pickBestVercelDomain(matchedVercelProject);
  const latestDeployment = vercelDeployments[0];
  const previewUrl =
    project?.vercelPreviewUrl ||
    (productionDomain ? `https://${productionDomain}` : null) ||
    (latestDeployment?.url ? `https://${latestDeployment.url}` : null);

  return (
    <View style={styles.container}>
      {/* Active Project Bar */}
      <View style={styles.projectHeader}>
        <Text style={styles.projectHeaderTitle} numberOfLines={1}>
          {project?.name ?? "RemoteChat Workspace"}
        </Text>
        <Text style={styles.projectHeaderMeta} numberOfLines={1}>
          {project?.githubRepoFullName ?? activeBranch}
        </Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentBar}>
        {(["chat", "files", "preview"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.segmentBtn, tab === t && styles.segmentBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>
              {t === "chat" ? "AI Chat" : t === "files" ? "Repo & Git" : "Live Preview"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "chat" && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            style={styles.chatList}
            contentContainerStyle={{ padding: 14, gap: 10 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.aiBubble]}
              >
                <Text style={styles.bubbleAuthor}>
                  {m.role === "user" ? "You" : `@${m.agentId ?? "assistant"}`}
                </Text>
                {m.role === "assistant" ? (
                  <MobileMarkdownRenderer content={m.content} />
                ) : (
                  <Text style={styles.bubbleText}>{m.content}</Text>
                )}
              </View>
            ))}

            {activeRun && activeRun.status === "in_progress" && (
              <Pressable
                style={styles.stepBtn}
                disabled={stepMutation.isPending}
                onPress={() => stepMutation.mutate(activeRun.id)}
              >
                <Play color="#fff" size={14} />
                <Text style={styles.stepBtnText}>
                  {stepMutation.isPending ? "Running Next Agent..." : "Run Next Orchestration Step"}
                </Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.composer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {["@orchestrator", "@architect", "@developer", "@qa", "@reviewer"].map((mention) => (
                <Pressable
                  key={mention}
                  style={styles.mentionPill}
                  onPress={() => setPrompt((p) => (p.startsWith(mention) ? p : `${mention} ${p}`))}
                >
                  <Text style={styles.mentionText}>{mention}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Instruct your AI engineering team..."
                placeholderTextColor={COLORS.fgMuted}
                value={prompt}
                onChangeText={setPrompt}
              />
              <Pressable style={styles.sendBtn} onPress={handleSend} disabled={chatMutation.isPending}>
                {chatMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Send color="#fff" size={16} />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {tab === "files" && (
        <View style={{ flex: 1 }}>
          {/* Sub-tabs: Files | Commits | PRs */}
          <View style={styles.subTabBar}>
            {(
              [
                { id: "files", label: "Files" },
                { id: "commits", label: "Commits" },
                { id: "prs", label: "Pull Requests" },
              ] as const
            ).map((st) => (
              <Pressable
                key={st.id}
                style={[styles.subTabBtn, repoSubTab === st.id && styles.subTabBtnActive]}
                onPress={() => {
                  setRepoSubTab(st.id);
                  if (st.id !== "files") setSelectedFile(null);
                }}
              >
                <Text style={[styles.subTabText, repoSubTab === st.id && styles.subTabTextActive]}>
                  {st.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 8 }}>
            {!project?.githubRepoFullName ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.muted}>
                  {(ghReposQuery.data?.repositories ?? []).length > 0
                    ? "Select a GitHub repository to link to this project:"
                    : "Connect GitHub in Settings first to browse repository files, commits, and PRs."}
                </Text>
                {(ghReposQuery.data?.repositories ?? []).map((repo) => (
                  <Pressable
                    key={repo.id}
                    style={styles.fileRow}
                    onPress={() => updateProjectMutation.mutate({ githubRepoFullName: repo.full_name })}
                  >
                    <Text style={styles.fileText}>{repo.full_name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : repoSubTab === "files" ? (
              loadingFile ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
              ) : selectedFile ? (
                <View style={{ gap: 10 }}>
                  <Pressable onPress={() => setSelectedFile(null)}>
                    <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "600" }}>
                      ← Back to File Tree
                    </Text>
                  </Pressable>
                  <Text style={{ color: COLORS.fg, fontWeight: "600", fontSize: 13 }}>
                    {selectedFile.path}
                  </Text>
                  <CodeViewer content={selectedFile.content} />
                </View>
              ) : (
                (treeQuery.data?.tree ?? []).slice(0, 80).map((f) => (
                  <Pressable
                    key={f.path}
                    style={styles.fileRow}
                    onPress={() => f.type === "blob" && openFile(f.path)}
                  >
                    {f.type === "tree" ? (
                      <Folder color={COLORS.accent} size={15} />
                    ) : (
                      <FileCode2 color={COLORS.primary} size={15} />
                    )}
                    <Text style={styles.fileText} numberOfLines={1}>
                      {f.path}
                    </Text>
                  </Pressable>
                ))
              )
            ) : repoSubTab === "commits" ? (
              activityQuery.isLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
              ) : (
                (activityQuery.data?.commits ?? []).map((c) => (
                  <Pressable
                    key={c.sha}
                    style={styles.activityCard}
                    onPress={() => Linking.openURL(c.html_url)}
                  >
                    <View style={styles.activityRow}>
                      <GitCommitHorizontal color={COLORS.accent} size={15} />
                      <Text style={styles.shaBadge}>{c.sha.slice(0, 7)}</Text>
                      <Text style={styles.activityAuthor}>{c.commit.author.name}</Text>
                    </View>
                    <Text style={styles.activityTitle}>{c.commit.message.split("\n")[0]}</Text>
                    <Text style={styles.activityDate}>
                      {new Date(c.commit.author.date).toLocaleString()}
                    </Text>
                  </Pressable>
                ))
              )
            ) : activityQuery.isLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : (activityQuery.data?.pulls ?? []).length === 0 ? (
              <Text style={styles.muted}>No Pull Requests found for {project.githubRepoFullName}.</Text>
            ) : (
              (activityQuery.data?.pulls ?? []).map((pr) => (
                <Pressable
                  key={pr.number}
                  style={styles.activityCard}
                  onPress={() => Linking.openURL(pr.html_url)}
                >
                  <View style={styles.activityRow}>
                    <GitPullRequest
                      color={pr.state === "open" ? COLORS.success : COLORS.primary}
                      size={15}
                    />
                    <Text style={styles.shaBadge}>#{pr.number}</Text>
                    <Text
                      style={[
                        styles.stateBadge,
                        { color: pr.state === "open" ? COLORS.success : COLORS.fgMuted },
                      ]}
                    >
                      {pr.state.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.activityTitle}>{pr.title}</Text>
                  <Text style={styles.activityDate}>
                    {pr.head.ref} → {pr.base.ref} • by {pr.user.login}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {tab === "preview" && (
        <View style={{ flex: 1 }}>
          {/* Vercel Domain & Deployment Header */}
          <View style={styles.previewToolbar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewDomain} numberOfLines={1}>
                {previewUrl ?? "No Vercel domain linked"}
              </Text>
              <Text style={styles.previewState}>
                {latestDeployment
                  ? `Latest: ${latestDeployment.state}`
                  : vercelQuery.data?.connection
                  ? "Connected to Vercel"
                  : "Connect Vercel in Settings"}
              </Text>
            </View>
            <Pressable
              style={styles.previewIconBtn}
              onPress={() => {
                setCustomUrlInput(previewUrl ?? "");
                setEditingPreviewUrl((v) => !v);
              }}
            >
              <Text style={{ color: COLORS.fg, fontSize: 11, fontWeight: "600" }}>URL</Text>
            </Pressable>
            <Pressable
              style={styles.previewIconBtn}
              onPress={() => setShowDeployments((v) => !v)}
            >
              <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: "600" }}>
                Deploys ({vercelDeployments.length})
              </Text>
            </Pressable>
            <Pressable
              style={styles.previewIconBtn}
              onPress={() => {
                setVercelAuthBlocked(false);
                vercelQuery.refetch();
              }}
            >
              <RefreshCw color={COLORS.fg} size={15} />
            </Pressable>
            {previewUrl && (
              <Pressable style={styles.previewIconBtn} onPress={() => Linking.openURL(previewUrl)}>
                <ExternalLink color={COLORS.accent} size={15} />
              </Pressable>
            )}
          </View>

          {editingPreviewUrl && (
            <View style={{ flexDirection: "row", gap: 8, padding: 10, backgroundColor: COLORS.surface2 }}>
              <TextInput
                style={[styles.chatInput, { flex: 1 }]}
                value={customUrlInput}
                onChangeText={setCustomUrlInput}
                placeholder="https://your-app.vercel.app"
                placeholderTextColor={COLORS.fgMuted}
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.sendBtn, { width: 64 }]}
                onPress={() => {
                  const val = customUrlInput.trim();
                  const normalized = val && !/^https?:\/\//i.test(val) ? `https://${val}` : val;
                  updateProjectMutation.mutate({ vercelPreviewUrl: normalized });
                  setVercelAuthBlocked(false);
                  setEditingPreviewUrl(false);
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Save</Text>
              </Pressable>
            </View>
          )}

          {/* Vercel Project Picker */}
          {vercelProjects.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.vercelPickerBar}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
            >
              {vercelProjects.map((vp) => {
                const domain = pickBestVercelDomain(vp);
                const isSelected = vp.id === project?.vercelProjectId;
                return (
                  <Pressable
                    key={vp.id}
                    style={[
                      styles.vercelPill,
                      isSelected && { borderColor: COLORS.accent, backgroundColor: "rgba(6,182,212,0.2)" },
                    ]}
                    onPress={() => {
                      setVercelAuthBlocked(false);
                      updateProjectMutation.mutate({
                        vercelProjectId: vp.id,
                        vercelPreviewUrl: domain ? `https://${domain}` : undefined,
                      });
                    }}
                  >
                    <Text style={styles.vercelPillText}>{vp.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {showDeployments ? (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
              {vercelDeployments.map((d) => (
                <Pressable
                  key={d.uid}
                  style={styles.activityCard}
                  onPress={() => {
                    updateProjectMutation.mutate({ vercelPreviewUrl: `https://${d.url}` });
                    setVercelAuthBlocked(false);
                    setShowDeployments(false);
                  }}
                >
                  <Text style={styles.activityTitle}>{d.name}</Text>
                  <Text style={styles.activityDate}>
                    {d.state} • https://{d.url}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : vercelAuthBlocked ? (
            <View style={styles.centerEmpty}>
              <Text style={{ color: COLORS.warning, fontSize: 14, fontWeight: "700", marginBottom: 8 }}>
                Vercel Deployment Protection Aktif
              </Text>
              <Text style={{ color: COLORS.fgMuted, fontSize: 12, textAlign: "center", marginBottom: 14 }}>
                URL {previewUrl} mengarah ke halaman login Vercel. Gunakan domain publik production Anda (tap tombol URL di atas) atau nonaktifkan Deployment Protection di Vercel Project Settings.
              </Text>
              {previewUrl && (
                <Pressable style={styles.stepBtn} onPress={() => Linking.openURL(previewUrl)}>
                  <ExternalLink color="#fff" size={14} />
                  <Text style={styles.stepBtnText}>Buka di Browser HP</Text>
                </Pressable>
              )}
            </View>
          ) : previewUrl ? (
            <WebView
              source={{ uri: previewUrl }}
              style={{ flex: 1, backgroundColor: "#09090B" }}
              startInLoadingState
              onNavigationStateChange={(navState) => {
                if (navState.url.includes("vercel.com/login") || navState.url.includes("vercel.com/sso")) {
                  setVercelAuthBlocked(true);
                }
              }}
              renderLoading={() => (
                <View style={styles.centerEmpty}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              )}
            />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
              <Text style={styles.muted}>
                Pilih project Vercel di atas atau hubungkan Vercel di Settings untuk menampilkan Live Preview.
              </Text>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  projectHeaderTitle: { color: COLORS.fg, fontSize: 13, fontWeight: "700", flex: 1 },
  projectHeaderMeta: { color: COLORS.accent, fontSize: 11, fontFamily: "monospace" },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    padding: 6,
    gap: 6,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segmentBtnActive: { backgroundColor: "rgba(139,92,246,0.2)" },
  segmentText: { color: COLORS.fgMuted, fontSize: 12, fontWeight: "600" },
  segmentTextActive: { color: COLORS.primary },
  subTabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface2,
    padding: 4,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subTabBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: "center" },
  subTabBtnActive: { backgroundColor: COLORS.surface },
  subTabText: { color: COLORS.fgMuted, fontSize: 11, fontWeight: "600" },
  subTabTextActive: { color: COLORS.accent },
  chatList: { flex: 1 },
  bubble: { borderRadius: 12, padding: 12, borderWidth: 1 },
  userBubble: {
    backgroundColor: "rgba(139,92,246,0.12)",
    borderColor: "rgba(139,92,246,0.35)",
    marginLeft: 28,
  },
  aiBubble: { backgroundColor: COLORS.surface, borderColor: COLORS.border, marginRight: 16 },
  bubbleAuthor: { color: COLORS.accent, fontSize: 11, fontWeight: "700", marginBottom: 4 },
  bubbleText: { color: COLORS.fg, fontSize: 13.5, lineHeight: 20 },
  stepBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stepBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  composer: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  mentionPill: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mentionText: { color: COLORS.accent, fontSize: 11, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.fg,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: COLORS.fgMuted, fontSize: 12, textAlign: "center", marginTop: 16 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  fileText: { color: COLORS.fg, fontSize: 12, fontFamily: "monospace", flex: 1 },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  shaBadge: {
    color: COLORS.accent,
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  stateBadge: { fontSize: 10, fontWeight: "700" },
  activityAuthor: { color: COLORS.fgMuted, fontSize: 11 },
  activityTitle: { color: COLORS.fg, fontSize: 13, fontWeight: "600" },
  activityDate: { color: COLORS.fgMuted, fontSize: 11 },
  previewToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewDomain: { color: COLORS.accent, fontSize: 12, fontFamily: "monospace", fontWeight: "600" },
  previewState: { color: COLORS.fgMuted, fontSize: 11 },
  previewIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vercelPickerBar: {
    maxHeight: 46,
    backgroundColor: COLORS.surface2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
  },
  vercelPill: {
    backgroundColor: "rgba(139,92,246,0.18)",
    borderColor: "rgba(139,92,246,0.4)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: "center",
  },
  vercelPillText: { color: COLORS.fg, fontSize: 11, fontWeight: "600" },
  centerEmpty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
});
