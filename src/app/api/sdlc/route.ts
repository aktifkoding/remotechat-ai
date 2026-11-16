import { NextRequest, NextResponse } from "next/server";
import { approvalDecisionSchema } from "@/lib/validators/schemas";
import {
  ensureProjectSdlcPhases,
  getAppState,
  saveAppState,
} from "@/server/repositories/app-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? "proj-remotechat-core";
  const state = getAppState();
  const phases = ensureProjectSdlcPhases(projectId);
  const approvals = state.approvals.filter((a) => a.projectId === projectId);
  return NextResponse.json({ phases, approvals });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      approvalId: string;
      decision: "approved" | "rejected";
      comment?: string;
    };
    const parsed = approvalDecisionSchema.safeParse({
      decision: body.decision,
      comment: body.comment,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const state = getAppState();
    const approval = state.approvals.find((a) => a.id === body.approvalId);
    if (!approval) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    approval.status = parsed.data.decision;
    const phases = ensureProjectSdlcPhases(approval.projectId);
    const integration = phases.find((p) => p.phaseKey === "integration");
    if (integration) {
      integration.approvalStatus = parsed.data.decision;
      integration.status = parsed.data.decision === "approved" ? "completed" : "blocked";
      integration.progress = parsed.data.decision === "approved" ? 100 : 80;
    }

    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorType: "user",
      action: `approval.${parsed.data.decision}`,
      resourceType: "approval_request",
      resourceId: approval.id,
      metadata: { title: approval.title, comment: parsed.data.comment ?? "" },
      createdAt: new Date().toISOString(),
    });

    saveAppState(state);
    return NextResponse.json({ approval, phases });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process approval" },
      { status: 500 }
    );
  }
}
