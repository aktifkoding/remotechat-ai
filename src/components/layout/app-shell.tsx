"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  Moon,
  Plug,
  Settings,
  Sparkles,
  Sun,
  TerminalSquare,
  UserCheck,
} from "lucide-react";
import { cn } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { Project } from "@/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    activeProjectId,
    setActiveProjectId,
    activeBranch,
    theme,
    toggleTheme,
    sidebarCollapsed,
    toggleSidebar,
  } = useWorkspaceStore();

  const { data: projectsData } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const projects = projectsData?.projects ?? [];
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      href: `/projects/${activeProject?.id ?? "proj-remotechat-core"}`,
      label: "Workspace",
      icon: TerminalSquare,
      matchPrefix: "/projects",
    },
    { href: "/agents", label: "Agents", icon: Bot },
    { href: "/skills", label: "Skills", icon: Sparkles },
    { href: "/workflows", label: "SDLC Workflows", icon: GitPullRequest },
    { href: "/integrations", label: "Integrations", icon: Plug },
    { href: "/ai-providers", label: "AI Models", icon: Cpu },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-200 shrink-0",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-white font-bold text-sm shadow-md shadow-[#8B5CF6]/20">
              RC
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="text-sm font-semibold tracking-tight">RemoteChat AI</div>
                <div className="text-[10px] text-[var(--fg-muted)]">Cloud Engineering</div>
              </div>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1 text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.matchPrefix
              ? pathname.startsWith(item.matchPrefix)
              : pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/25"
                    : "text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          {!sidebarCollapsed ? (
            <div className="rounded-lg bg-[var(--surface-2)] p-2.5 border border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                <span>Cloud Orchestrator Ready</span>
              </div>
              <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
                4 Built-in Agents • 20 Skills
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" title="Cloud Orchestrator Ready" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
              <select
                aria-label="Project Switcher"
                value={activeProject?.id ?? ""}
                onChange={(e) => setActiveProjectId(e.target.value)}
                className="bg-transparent text-xs font-medium text-[var(--fg)] focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#18181B] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--fg-muted)]">
              <GitBranch className="h-3.5 w-3.5 text-[#06B6D4]" />
              <span className="font-mono">{activeBranch}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-medium hover:border-[#8B5CF6]/50"
            >
              <UserCheck className="h-3.5 w-3.5 text-[#22C55E]" />
              <span className="hidden sm:inline">Workspace Account</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
