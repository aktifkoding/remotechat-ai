import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-sm shadow-[#8B5CF6]/20",
    secondary: "bg-[var(--surface-2)] text-[var(--fg)] hover:opacity-90 border border-[var(--border)]",
    outline: "border border-[var(--border)] bg-transparent text-[var(--fg)] hover:bg-[var(--surface-2)]",
    ghost: "bg-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]",
    danger: "bg-[#EF4444] text-white hover:bg-[#DC2626]",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg",
    md: "h-9 px-4 text-sm rounded-lg",
    lg: "h-10 px-5 text-sm rounded-xl",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50",
        className
      )}
      {...props}
    />
  );
}

export function StatusPill({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const styles: Record<string, string> = {
    completed: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
    connected: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
    READY: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
    approved: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
    in_progress: "bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30",
    BUILDING: "bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30",
    queued: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30",
    needs_approval: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
    pending: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    untested: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    failed: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
    error: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
    ERROR: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
    blocked: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
    cancelled: "bg-zinc-600/15 text-zinc-400 border-zinc-600/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        styles[status] ?? styles.pending
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
