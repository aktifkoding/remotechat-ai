import { NextRequest, NextResponse } from "next/server";
import {
  getAppState,
  resolveIntegrationToken,
  saveAppState,
  saveIntegrationToken,
} from "@/server/repositories/app-store";
import { inspectSupabaseTables, listSupabaseProjects } from "@/modules/supabase/client";

export async function GET(req: NextRequest) {
  const state = getAppState();
  const entry = state.integrations.supabase;
  const token = resolveIntegrationToken("supabase");
  const { searchParams } = new URL(req.url);
  const projectRef = searchParams.get("projectRef");

  if (!token || !entry) {
    return NextResponse.json({ connection: null, projects: [] });
  }

  try {
    if (projectRef) {
      const tables = await inspectSupabaseTables(token, projectRef);
      return NextResponse.json({ tables });
    }
    const projects = await listSupabaseProjects(token);
    return NextResponse.json({
      connection: {
        provider: entry.provider,
        accountLabel: entry.accountLabel,
        maskedToken: entry.maskedToken,
        status: entry.status,
        connectedAt: entry.connectedAt,
      },
      projects,
    });
  } catch (err) {
    return NextResponse.json({
      connection: {
        provider: entry.provider,
        accountLabel: entry.accountLabel,
        maskedToken: entry.maskedToken,
        status: "error",
        connectedAt: entry.connectedAt,
      },
      projects: [],
      error: err instanceof Error ? err.message : "Supabase API error",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; action?: "disconnect" };
    if (body.action === "disconnect") {
      const state = getAppState();
      state.integrations.supabase = null;
      saveAppState(state);
      return NextResponse.json({ disconnected: true });
    }

    if (!body.token || body.token.trim().length < 8) {
      return NextResponse.json({ error: "Valid Supabase Access Token is required" }, { status: 400 });
    }

    const projects = await listSupabaseProjects(body.token.trim());
    const saved = saveIntegrationToken("supabase", `Supabase (${projects.length} projects)`, body.token.trim());
    return NextResponse.json({ connection: saved, projects });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Supabase connection failed" },
      { status: 400 }
    );
  }
}
