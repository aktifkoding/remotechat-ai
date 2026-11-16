import { NextRequest, NextResponse } from "next/server";
import { getAppState } from "@/server/repositories/app-store";
import {
  cancelOrchestrationRun,
  executeOrchestrationStep,
} from "@/modules/orchestrator/engine";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const run = getAppState().orchestrationRuns.find((r) => r.id === id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as {
    action: "step" | "cancel";
    providerId?: string;
    model?: string;
  };

  if (body.action === "cancel") {
    const run = cancelOrchestrationRun(id);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    return NextResponse.json({ run });
  }

  const run = await executeOrchestrationStep(id, body.providerId, body.model);
  return NextResponse.json({ run });
}
