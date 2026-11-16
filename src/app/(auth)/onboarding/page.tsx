"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui/primitives";
import { CheckCircle2, Cpu, FolderGit2, Plug } from "lucide-react";

export default function OnboardingPage() {
  const steps = [
    { title: "1. Connect GitHub, Supabase & Vercel", href: "/integrations", icon: Plug },
    { title: "2. Configure Custom AI Provider", href: "/ai-providers", icon: Cpu },
    { title: "3. Open Your Cloud Workspace", href: "/dashboard", icon: FolderGit2 },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <Card className="w-full max-w-lg p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Welcome to RemoteChat AI</h1>
          <p className="text-xs text-[var(--fg-muted)]">
            Complete these 3 steps to activate your autonomous cloud engineering team.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 hover:border-[#8B5CF6]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[#8B5CF6]" />
                  <span className="text-sm font-medium">{s.title}</span>
                </div>
                <CheckCircle2 className="h-4 w-4 text-[var(--fg-muted)]" />
              </Link>
            );
          })}
        </div>

        <Link href="/dashboard">
          <Button className="w-full">Go to Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
