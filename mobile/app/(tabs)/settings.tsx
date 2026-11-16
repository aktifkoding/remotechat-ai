import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { normalizeServerUrl, useMobileStore } from "@/stores/mobile-store";
import { COLORS } from "@/theme/colors";
import { CheckCircle2, Trash2, Zap } from "lucide-react-native";

export default function MobileSettingsScreen() {
  const qc = useQueryClient();
  const { serverUrl, setServerUrl } = useMobileStore();
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [providerName, setProviderName] = useState("Custom OpenAI Compatible");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [ghToken, setGhToken] = useState("");
  const [sbToken, setSbToken] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [testingServer, setTestingServer] = useState(false);

  useEffect(() => {
    setUrlInput(serverUrl);
  }, [serverUrl]);

  const providersQuery = useQuery({
    queryKey: ["mobile-providers", serverUrl],
    queryFn: () =>
      apiFetch<{
        providers: Array<{
          id: string;
          name: string;
          defaultModel: string;
          maskedApiKey: string;
          status: string;
        }>;
      }>("/api/ai-providers"),
  });

  const ghQuery = useQuery({
    queryKey: ["mobile-gh", serverUrl],
    queryFn: () =>
      apiFetch<{ connection: { accountLabel: string; maskedToken: string } | null }>(
        "/api/integrations/github"
      ),
  });

  const sbQuery = useQuery({
    queryKey: ["mobile-sb", serverUrl],
    queryFn: () =>
      apiFetch<{ connection: { accountLabel: string; maskedToken: string } | null }>(
        "/api/integrations/supabase"
      ),
  });

  const vercelQuery = useQuery({
    queryKey: ["mobile-vercel", serverUrl],
    queryFn: () =>
      apiFetch<{ connection: { accountLabel: string; maskedToken: string } | null }>(
        "/api/integrations/vercel"
      ),
  });

  async function handleSaveAndTestServer() {
    Keyboard.dismiss();
    setTestingServer(true);
    setFeedback(null);
    try {
      const normalized = await setServerUrl(urlInput);
      setUrlInput(normalized);
      const res = await fetch(`${normalized}/api/health`);
      const json = (await res.json()) as { status?: string };
      if (!res.ok || json.status !== "ok") {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      await qc.invalidateQueries();
      setFeedback({ ok: true, text: `Server saved & connected: ${normalized}` });
    } catch (err) {
      setFeedback({
        ok: false,
        text: `Saved URL, but server unreachable: ${err instanceof Error ? err.message : "Network error"}`,
      });
    } finally {
      setTestingServer(false);
    }
  }

  const saveProvider = useMutation({
    mutationFn: () =>
      apiFetch("/api/ai-providers", {
        method: "POST",
        body: JSON.stringify({
          name: providerName.trim(),
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          defaultModel: model.trim(),
          isDefault: true,
        }),
      }),
    onSuccess: () => {
      Keyboard.dismiss();
      qc.invalidateQueries({ queryKey: ["mobile-providers"] });
      setApiKey("");
      setFeedback({ ok: true, text: "AI Provider encrypted & saved on RemoteChat server." });
    },
    onError: (err) => setFeedback({ ok: false, text: err instanceof Error ? err.message : "Save failed" }),
  });

  const testProvider = useMutation({
    mutationFn: (providerId?: string) =>
      apiFetch<{ ok: boolean; reply?: string; latencyMs?: number; error?: string }>(
        "/api/ai-providers/test",
        {
          method: "POST",
          body: JSON.stringify(
            providerId
              ? { providerId }
              : { baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() }
          ),
        }
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["mobile-providers"] });
      setFeedback({
        ok: res.ok,
        text: res.ok ? `AI Connected (${res.latencyMs}ms): "${res.reply}"` : res.error ?? "Test failed",
      });
    },
    onError: (err) => setFeedback({ ok: false, text: err instanceof Error ? err.message : "Test failed" }),
  });

  const deleteProvider = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/ai-providers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mobile-providers"] });
      setFeedback({ ok: true, text: "AI Provider removed." });
    },
  });

  const integrationMutation = useMutation({
    mutationFn: (params: {
      provider: "github" | "supabase" | "vercel";
      token?: string;
      action?: "disconnect";
    }) =>
      apiFetch(`/api/integrations/${params.provider}`, {
        method: "POST",
        body: JSON.stringify(params.action ? { action: params.action } : { token: params.token?.trim() }),
      }),
    onSuccess: (_data, vars) => {
      Keyboard.dismiss();
      qc.invalidateQueries({ queryKey: [`mobile-${vars.provider === "github" ? "gh" : vars.provider === "supabase" ? "sb" : "vercel"}`] });
      if (vars.provider === "github") setGhToken("");
      if (vars.provider === "supabase") setSbToken("");
      if (vars.provider === "vercel") setVercelToken("");
      setFeedback({
        ok: true,
        text: `${vars.provider.toUpperCase()} ${vars.action === "disconnect" ? "disconnected" : "connected"}.`,
      });
    },
    onError: (err) => setFeedback({ ok: false, text: err instanceof Error ? err.message : "Failed" }),
  });

  const normalizedPreview = normalizeServerUrl(urlInput);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {feedback && (
          <View style={[styles.banner, feedback.ok ? styles.bannerOk : styles.bannerErr]}>
            <Text style={styles.bannerText}>{feedback.text}</Text>
          </View>
        )}

        {/* Server URL */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RemoteChat Server URL</Text>
          <Text style={styles.muted}>
            Active: {serverUrl} (use http://192.168.x.x:3000 on local Wi-Fi or your https:// Vercel URL)
          </Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.0.108:3000"
            placeholderTextColor={COLORS.fgMuted}
          />
          <Pressable
            style={[styles.btn, (!normalizedPreview || testingServer) && styles.disabled]}
            disabled={!normalizedPreview || testingServer}
            onPress={handleSaveAndTestServer}
          >
            {testingServer ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Save & Test Server URL</Text>
            )}
          </Pressable>
        </View>

        {/* Custom AI Provider */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Custom AI Provider (Server-Encrypted)</Text>
          <TextInput
            style={styles.input}
            placeholder="Provider Name"
            placeholderTextColor={COLORS.fgMuted}
            value={providerName}
            onChangeText={setProviderName}
          />
          <TextInput
            style={styles.input}
            placeholder="Base URL (https://.../v1)"
            placeholderTextColor={COLORS.fgMuted}
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="API Key (sk-...)"
            placeholderTextColor={COLORS.fgMuted}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Default Model (e.g. gpt-4o-mini)"
            placeholderTextColor={COLORS.fgMuted}
            value={model}
            onChangeText={setModel}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.rowBtns}>
            <Pressable
              style={[
                styles.secondaryBtn,
                { flex: 1 },
                (!apiKey.trim() || !baseUrl.trim() || testProvider.isPending) && styles.disabled,
              ]}
              disabled={!apiKey.trim() || !baseUrl.trim() || testProvider.isPending}
              onPress={() => testProvider.mutate(undefined)}
            >
              <Zap color={COLORS.accent} size={14} />
              <Text style={styles.secondaryBtnText}>
                {testProvider.isPending ? "Testing..." : "Test"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.btn,
                { flex: 1 },
                (!apiKey.trim() || !baseUrl.trim() || saveProvider.isPending) && styles.disabled,
              ]}
              disabled={!apiKey.trim() || !baseUrl.trim() || saveProvider.isPending}
              onPress={() => saveProvider.mutate()}
            >
              <Text style={styles.btnText}>
                {saveProvider.isPending ? "Saving..." : "Save Provider"}
              </Text>
            </Pressable>
          </View>

          {(providersQuery.data?.providers ?? []).map((p) => (
            <View key={p.id} style={styles.providerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.name}</Text>
                <Text style={styles.muted}>
                  {p.defaultModel} • {p.maskedApiKey} • {p.status}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable style={styles.iconBtn} onPress={() => testProvider.mutate(p.id)}>
                  <CheckCircle2 color={COLORS.success} size={16} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => deleteProvider.mutate(p.id)}>
                  <Trash2 color={COLORS.error} size={16} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Cloud Integrations: GitHub, Supabase, Vercel */}
        {[
          {
            key: "github" as const,
            title: "GitHub Integration",
            placeholder: "GitHub Personal Access Token (ghp_...)",
            value: ghToken,
            setValue: setGhToken,
            conn: ghQuery.data?.connection,
          },
          {
            key: "supabase" as const,
            title: "Supabase Integration",
            placeholder: "Supabase Management Token (sbp_...)",
            value: sbToken,
            setValue: setSbToken,
            conn: sbQuery.data?.connection,
          },
          {
            key: "vercel" as const,
            title: "Vercel Integration",
            placeholder: "Vercel API Token",
            value: vercelToken,
            setValue: setVercelToken,
            conn: vercelQuery.data?.connection,
          },
        ].map((item) => (
          <View key={item.key} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.conn ? (
              <View style={styles.providerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{item.conn.accountLabel}</Text>
                  <Text style={styles.muted}>{item.conn.maskedToken}</Text>
                </View>
                <Pressable
                  style={styles.disconnectBtn}
                  onPress={() => integrationMutation.mutate({ provider: item.key, action: "disconnect" })}
                >
                  <Text style={{ color: COLORS.error, fontSize: 12, fontWeight: "600" }}>Disconnect</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={item.placeholder}
                  placeholderTextColor={COLORS.fgMuted}
                  value={item.value}
                  onChangeText={item.setValue}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Pressable
                  style={[styles.btn, (!item.value.trim() || integrationMutation.isPending) && styles.disabled]}
                  disabled={!item.value.trim() || integrationMutation.isPending}
                  onPress={() => integrationMutation.mutate({ provider: item.key, token: item.value })}
                >
                  <Text style={styles.btnText}>
                    {integrationMutation.isPending ? "Connecting..." : `Connect ${item.key.toUpperCase()}`}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  banner: { borderWidth: 1, borderRadius: 10, padding: 12 },
  bannerOk: { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.4)" },
  bannerErr: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.4)" },
  bannerText: { color: COLORS.fg, fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: COLORS.fg, fontSize: 14, fontWeight: "700" },
  muted: { color: COLORS.fgMuted, fontSize: 11 },
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
  rowBtns: { flexDirection: "row", gap: 8 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  secondaryBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: COLORS.fg, fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.5 },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  providerName: { color: COLORS.fg, fontSize: 12, fontWeight: "600" },
  iconBtn: { padding: 6, borderRadius: 8, backgroundColor: COLORS.surface },
  disconnectBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.12)" },
});
