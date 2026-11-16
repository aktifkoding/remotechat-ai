import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMobileStore } from "@/stores/mobile-store";
import { COLORS } from "@/theme/colors";
import { Bot, Check, ShieldAlert, X } from "lucide-react-native";

interface SdlcPhase {
  phaseKey: string;
  phaseOrder: number;
  responsibleAgent: string;
  status: string;
  progress: number;
}

interface Approval {
  id: string;
  title: string;
  description: string;
  status: string;
}

export default function MobileWorkflowsScreen() {
  const qc = useQueryClient();
  const { activeProjectId } = useMobileStore();

  const sdlcQuery = useQuery({
    queryKey: ["mobile-sdlc", activeProjectId],
    queryFn: () => apiFetch<{ phases: SdlcPhase[]; approvals: Approval[] }>(`/api/sdlc?projectId=${activeProjectId}`),
  });

  const agentsQuery = useQuery({
    queryKey: ["mobile-agents"],
    queryFn: () =>
      apiFetch<{ agents: Array<{ id: string; name: string; mention: string; role: string }> }>("/api/agents"),
  });

  const decideMutation = useMutation({
    mutationFn: (params: { approvalId: string; decision: "approved" | "rejected" }) =>
      apiFetch("/api/sdlc", { method: "POST", body: JSON.stringify(params) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mobile-sdlc", activeProjectId] }),
  });

  const phases = sdlcQuery.data?.phases ?? [];
  const approvals = sdlcQuery.data?.approvals ?? [];
  const agents = agentsQuery.data?.agents ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>8-Phase SDLC Pipeline</Text>
      <View style={styles.grid}>
        {phases.map((p) => (
          <View key={p.phaseKey} style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>
              {p.phaseOrder}. {p.phaseKey.toUpperCase()}
            </Text>
            <Text style={styles.phaseMeta}>@{p.responsibleAgent} • {p.status}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${p.progress}%` }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.rowGap}>
        <ShieldAlert color={COLORS.warning} size={16} />
        <Text style={styles.sectionTitle}>Human Approval Gates ({approvals.length})</Text>
      </View>
      {approvals.length === 0 ? (
        <Text style={styles.muted}>No pending approvals.</Text>
      ) : (
        approvals.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardDesc}>{a.description}</Text>
            {a.status === "pending" && (
              <View style={styles.btnRow}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                  onPress={() => decideMutation.mutate({ approvalId: a.id, decision: "approved" })}
                >
                  <Check color="#fff" size={14} />
                  <Text style={styles.btnText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
                  onPress={() => decideMutation.mutate({ approvalId: a.id, decision: "rejected" })}
                >
                  <X color="#fff" size={14} />
                  <Text style={styles.btnText}>Reject</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}

      <View style={styles.rowGap}>
        <Bot color={COLORS.accent} size={16} />
        <Text style={styles.sectionTitle}>Built-in AI Agents ({agents.length})</Text>
      </View>
      {agents.map((ag) => (
        <View key={ag.id} style={styles.card}>
          <View style={styles.spaceBetween}>
            <Text style={styles.cardTitle}>{ag.name}</Text>
            <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "700" }}>{ag.mention}</Text>
          </View>
          <Text style={styles.cardDesc}>{ag.role}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 14 },
  sectionTitle: { color: COLORS.fg, fontSize: 14, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  phaseCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  phaseTitle: { color: COLORS.fg, fontSize: 12, fontWeight: "700" },
  phaseMeta: { color: COLORS.fgMuted, fontSize: 11 },
  progressTrack: { height: 5, backgroundColor: COLORS.surface2, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.primary },
  rowGap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  spaceBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muted: { color: COLORS.fgMuted, fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  cardTitle: { color: COLORS.fg, fontSize: 13, fontWeight: "600" },
  cardDesc: { color: COLORS.fgMuted, fontSize: 12 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
