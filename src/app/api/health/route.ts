import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/database/supabase-server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "remotechat-ai",
    supabaseConfigured: isSupabaseServerConfigured(),
    timestamp: new Date().toISOString(),
  });
}
