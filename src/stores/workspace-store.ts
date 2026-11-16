"use client";

import { create } from "zustand";

interface WorkspaceState {
  activeProjectId: string;
  activeBranch: string;
  theme: "dark" | "light";
  sidebarCollapsed: boolean;
  centerTab: "chat" | "editor" | "terminal";
  previewDevice: "desktop" | "tablet" | "mobile";
  selectedFilePath: string | null;
  setActiveProjectId: (id: string) => void;
  setActiveBranch: (branch: string) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setCenterTab: (tab: "chat" | "editor" | "terminal") => void;
  setPreviewDevice: (device: "desktop" | "tablet" | "mobile") => void;
  setSelectedFilePath: (path: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProjectId: "proj-remotechat-core",
  activeBranch: "main",
  theme: "dark",
  sidebarCollapsed: false,
  centerTab: "chat",
  previewDevice: "desktop",
  selectedFilePath: null,
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setActiveBranch: (activeBranch) => set({ activeBranch }),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("light", next === "light");
      }
      return { theme: next };
    }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCenterTab: (centerTab) => set({ centerTab }),
  setPreviewDevice: (previewDevice) => set({ previewDevice }),
  setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
}));
