import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const DEFAULT_SERVER_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export function normalizeServerUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url;
}

interface MobileState {
  serverUrl: string;
  activeProjectId: string;
  activeBranch: string;
  setServerUrl: (url: string) => Promise<string>;
  loadPersistedUrl: () => Promise<void>;
  setActiveProjectId: (id: string) => void;
  setActiveBranch: (branch: string) => void;
}

export const useMobileStore = create<MobileState>((set) => ({
  serverUrl: DEFAULT_SERVER_URL,
  activeProjectId: "proj-remotechat-core",
  activeBranch: "main",
  setServerUrl: async (url) => {
    const normalized = normalizeServerUrl(url);
    set({ serverUrl: normalized });
    if (Platform.OS !== "web") {
      try {
        await SecureStore.setItemAsync("remotechat_server_url", normalized);
      } catch {
        // ignore
      }
    }
    return normalized;
  },
  loadPersistedUrl: async () => {
    if (Platform.OS === "web") return;
    try {
      const saved = await SecureStore.getItemAsync("remotechat_server_url");
      if (saved) set({ serverUrl: normalizeServerUrl(saved) });
    } catch {
      // ignore
    }
  },
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setActiveBranch: (activeBranch) => set({ activeBranch }),
}));
