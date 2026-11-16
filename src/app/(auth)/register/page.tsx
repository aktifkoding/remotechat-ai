"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/database/supabase-browser";
import { Button, Card, Input } from "@/components/ui/primitives";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        router.push("/onboarding");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authErr) throw authErr;
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <Card className="w-full max-w-md p-7 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Create your RemoteChat AI account</h1>
          <p className="text-xs text-[var(--fg-muted)]">Start orchestrating your cloud engineering team.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--fg-muted)]">Full Name</label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Rivera" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--fg-muted)]">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@company.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--fg-muted)]">Password</label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          {error && <div className="text-xs text-[#EF4444]">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--fg-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#8B5CF6] hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
