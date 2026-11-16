import { NextRequest, NextResponse } from "next/server";
import { verifyGitHubWebhookSignature } from "@/lib/security/webhook";
import { getAppState, saveAppState } from "@/server/repositories/app-store";

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event") ?? "unknown";
  const rawBody = await req.text();

  if (secret && !verifyGitHubWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const state = getAppState();
  state.auditLogs.unshift({
    id: `wh-${Date.now()}`,
    actorType: "system",
    action: `github.webhook.${event}`,
    resourceType: "github_webhook",
    metadata: { event },
    createdAt: new Date().toISOString(),
  });
  saveAppState(state);

  return NextResponse.json({ received: true, event });
}
