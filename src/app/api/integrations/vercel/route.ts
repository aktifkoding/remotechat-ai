import { NextRequest, NextResponse } from "next/server";
import {
  getAppState,
  resolveIntegrationToken,
  saveAppState,
  saveIntegrationToken,
} from "@/server/repositories/app-store";
import {
  getDeploymentEvents,
  listDeployments,
  listVercelProjects,
  verifyVercelToken,
} from "@/modules/vercel/client";

export async function GET(req: NextRequest) {
  const state = getAppState();
  const entry = state.integrations.vercel;
  const token = resolveIntegrationToken("vercel");
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const deploymentId = searchParams.get("deploymentId") ?? undefined;

  if (!token || !entry) {
    return NextResponse.json({ connection: null, projects: [], deployments: [] });
  }

  try {
    if (deploymentId) {
      const events = await getDeploymentEvents(token, deploymentId);
      return NextResponse.json({ events });
    }

    const [projRes, depRes] = await Promise.all([
      listVercelProjects(token),
      listDeployments(token, projectId),
    ]);

    return NextResponse.json({
      connection: {
        provider: entry.provider,
        accountLabel: entry.accountLabel,
        maskedToken: entry.maskedToken,
        status: entry.status,
        connectedAt: entry.connectedAt,
      },
      projects: projRes.projects,
      deployments: depRes.deployments,
    });
  } catch (err) {
    return NextResponse.json(
      {
        connection: {
          provider: entry.provider,
          accountLabel: entry.accountLabel,
          maskedToken: entry.maskedToken,
          status: "error",
          connectedAt: entry.connectedAt,
        },
        projects: [],
        deployments: [],
        error: err instanceof Error ? err.message : "Vercel sync failed",
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; action?: "disconnect" };
    if (body.action === "disconnect") {
      const state = getAppState();
      state.integrations.vercel = null;
      saveAppState(state);
      return NextResponse.json({ disconnected: true });
    }

    if (!body.token || body.token.trim().length < 8) {
      return NextResponse.json({ error: "Valid Vercel API Token is required" }, { status: 400 });
    }

    const userRes = await verifyVercelToken(body.token.trim());
    const saved = saveIntegrationToken("vercel", userRes.user.username || userRes.user.email, body.token.trim());
    const projRes = await listVercelProjects(body.token.trim());
    return NextResponse.json({ connection: saved, projects: projRes.projects });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Vercel connection failed" },
      { status: 400 }
    );
  }
}
