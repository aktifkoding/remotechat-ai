import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMobileStore } from "@/stores/mobile-store";
import { COLORS } from "@/theme/colors";
import { FolderGit2, Plus, TerminalSquare } from "lucide-react-native";

interface Project {
  id: string;
  name: string;
  framework: string | null;
  activeBranch: string;
  githubRepoFullName?: string | null;
}

export default function MobileDashboardScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { activeProjectId, setActiveProjectId, setActiveBranch, serverUrl } = useMobileStore();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("Next.js + Expo");

  const projectsQuery = useQuery({
    queryKey: ["mobile-projects", serverUrl],
    queryFn: () => apiFetch<{ projects: Project[] }>("/api/projects"),
  });

  const providersQuery = useQuery({
    queryKey: ["mobile-providers", serverUrl],
    queryFn: () =>
      apiFetch<{ providers: Array<{ id: string; name: string }>; usageLogs: Array<{ totalTokens: number }> }>(
        "/api/ai-providers"
      ),
  });

  const ghQuery = useQuery({
    queryKey: ["mobile-gh", serverUrl],
    queryFn: () => apiFetch<{ connection: { accountLabel: string } | null }>("/api/integrations/github"),
  });

  const createProject = useMutation({
    mutationFn: () =>
      apiFetch<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, framework }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["mobile-projects"] });
      setActiveProjectId(res.project.id);
      setName("");
      setShowNew(false);
    },
  });

  const projects = projectsQuery.data?.projects ?? [];
  const totalTokens = (providersQuery.data?.usageLogs ?? []).reduce((a, b) => a + b.totalTokens, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>RemoteChat AI</Text>
          <Text style={styles.subtitle}>Your Entire Development Team. One Remote Workspace.</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowNew((v) => !v)}>
          <Plus color="#fff" size={16} />
          <Text style={styles.addBtnText}>New</Text>
        </Pressable>
      </View>

      {showNew && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Cloud Project</Text>
          <TextInput
            style={styles.input}
            placeholder="Project Name"
            placeholderTextColor={COLORS.fgMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Framework"
            placeholderTextColor={COLORS.fgMuted}
            value={framework}
            onChangeText={setFramework}
          />
          <Pressable
            style={[styles.primaryBtn, !name.trim() && styles.disabled]}
            disabled={!name.trim() || createProject.isPending}
            onPress={() => createProject.mutate()}
          >
            <Text style={styles.primaryBtnText}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* KPI Row */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Projects</Text>
          <Text style={styles.kpiValue}>{projects.length}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>AI Providers</Text>
          <Text style={styles.kpiValue}>{providersQuery.data?.providers.length ?? 0}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Tokens Used</Text>
          <Text style={styles.kpiValue}>{totalTokens}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>GitHub</Text>
          <Text style={[styles.kpiValue, { fontSize: 13, color: ghQuery.data?.connection ? COLORS.success : COLORS.fgMuted }]}>
            {ghQuery.data?.connection ? ghQuery.data.connection.accountLabel : "Not Linked"}
          </Text>
        </View>
      </View>

      {projectsQuery.isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Cannot reach RemoteChat server at {serverUrl}. Check Settings tab to update the Server URL.
          </Text>
        </View>
      )}

      {projectsQuery.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Projects</Text>
          {projects.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.projectCard, activeProjectId === p.id && styles.projectCardActive]}
              onPress={() => {
                setActiveProjectId(p.id);
                setActiveBranch(p.activeBranch || "main");
                navigation.navigate("workspace" as never);
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.rowGap}>
                  <FolderGit2 color={COLORS.primary} size={16} />
                  <Text style={styles.projectName}>{p.name}</Text>
                </View>
                <Text style={styles.projectMeta}>
                  {p.framework ?? "Web"} • branch: {p.activeBranch}
                </Text>
              </View>
              <View style={styles.openPill}>
                <TerminalSquare color={COLORS.accent} size={14} />
                <Text style={styles.openPillText}>Open</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { color: COLORS.fg, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.fgMuted, fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: COLORS.fg, fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.fg,
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.5 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  kpiLabel: { color: COLORS.fgMuted, fontSize: 11 },
  kpiValue: { color: COLORS.fg, fontSize: 18, fontWeight: "700", marginTop: 4 },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: COLORS.error, fontSize: 12 },
  section: { gap: 10 },
  sectionTitle: { color: COLORS.fg, fontSize: 14, fontWeight: "600" },
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  projectCardActive: { borderColor: COLORS.primary },
  rowGap: { flexDirection: "row", alignItems: "center", gap: 8 },
  projectName: { color: COLORS.fg, fontSize: 14, fontWeight: "600" },
  projectMeta: { color: COLORS.fgMuted, fontSize: 11, marginTop: 4 },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openPillText: { color: COLORS.accent, fontSize: 12, fontWeight: "600" },
});
