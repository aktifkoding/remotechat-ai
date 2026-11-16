"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/database/supabase-browser";
import { Button, Card, Input } from "@/components/ui/primitives";
import { ArrowRight, Github, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        router.push("/dashboard");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "github" | "google") {
    if (!isSupabaseConfigured()) {
      router.push("/onboarding");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <Card className="w-full max-w-md p-7 space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-white font-bold">
            RC
          </div>
          <h1 className="text-xl font-semibold">Sign in to RemoteChat AI</h1>
          <p className="text-xs text-[var(--fg-muted)]">
            Your Entire Development Team. One Remote Workspace.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--fg-muted)]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[var(--fg-muted)]" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--fg-muted)]">Password</label>
              <Link href="/forgot-password" className="text-xs text-[#8B5CF6] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[var(--fg-muted)]" />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-2.5 text-xs text-[#EF4444]">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="relative flex items-center justify-center text-xs text-[var(--fg-muted)]">
          <span className="border-t border-[var(--border)] w-full" />
          <span className="bg-[var(--surface)] px-2">or</span>
          <span className="border-t border-[var(--border)] w-full" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" type="button" onClick={() => handleOAuth("github")}>
            <Github className="h-4 w-4" /> GitHub
          </Button>
          <Button variant="secondary" type="button" onClick={() => handleOAuth("google")}>
            Google
          </Button>
        </div>

        <p className="text-center text-xs text-[var(--fg-muted)]">
          New to RemoteChat?{" "}
          <Link href="/register" className="text-[#8B5CF6] hover:underline">
            Create workspace account
          </Link>
        </p>
      </Card>
    </div>
  );
}
