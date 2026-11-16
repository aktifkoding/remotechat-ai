import { NextRequest, NextResponse } from "next/server";
import {
  getAppState,
  resolveIntegrationToken,
  saveAppState,
  saveIntegrationToken,
} from "@/server/repositories/app-store";
import { listRepositories, verifyGitHubToken } from "@/modules/github/client";

export async function GET() {
  const state = getAppState();
  const entry = state.integrations.github;
  const token = resolveIntegrationToken("github");

  let repos: Awaited<ReturnType<typeof listRepositories>> = [];
  if (token) {
    try {
      repos = await listRepositories(token);
    } catch {
      // Return empty repos if token expired
    }
  }

  return NextResponse.json({
    connection: entry
      ? {
          provider: entry.provider,
          accountLabel: entry.accountLabel,
          maskedToken: entry.maskedToken,
          status: entry.status,
          connectedAt: entry.connectedAt,
          metadata: entry.metadata,
        }
      : null,
    repositories: repos,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; action?: "disconnect" };
    if (body.action === "disconnect") {
      const state = getAppState();
      state.integrations.github = null;
      saveAppState(state);
      return NextResponse.json({ disconnected: true });
    }

    if (!body.token || body.token.trim().length < 8) {
      return NextResponse.json({ error: "Valid GitHub Personal Access Token is required" }, { status: 400 });
    }

    const user = await verifyGitHubToken(body.token.trim());
    const saved = saveIntegrationToken("github", user.login, body.token.trim(), {
      avatarUrl: user.avatar_url,
      name: user.name,
    });

    const repos = await listRepositories(body.token.trim());
    return NextResponse.json({ connection: saved, repositories: repos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GitHub connection failed" },
      { status: 400 }
    );
  }
}
