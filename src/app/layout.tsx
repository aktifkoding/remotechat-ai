import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RemoteChat AI — Your Entire Development Team. One Remote Workspace.",
  description:
    "Cloud-based AI software development platform with multi-agent orchestration, GitHub, Supabase, Vercel, and custom AI providers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
