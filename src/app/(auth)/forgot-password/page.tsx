"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/database/supabase-browser";
import { Button, Card, Input } from "@/components/ui/primitives";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <Card className="w-full max-w-md p-7 space-y-5">
        <h1 className="text-lg font-semibold">Reset Password</h1>
        {sent ? (
          <p className="text-xs text-[#22C55E]">
            If an account exists for {email}, a password reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
            />
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
          </form>
        )}
        <Link href="/login" className="block text-center text-xs text-[#8B5CF6] hover:underline">
          Back to Sign In
        </Link>
      </Card>
    </div>
  );
}
