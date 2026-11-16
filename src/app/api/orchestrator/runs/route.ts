import { NextRequest, NextResponse } from "next/server";
import { getAppState } from "@/server/repositories/app-store";
import {
  createOrchestrationRun,
  executeOrchestrationStep,
} from "@/modules/orchestrator/engine";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const state = getAppState();
  const runs = projectId
    ? state.orchestrationRuns.filter((r) => r.projectId === projectId)
    : state.orchestrationRuns;
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      projectId: string;
      prompt: string;
      providerId?: string;
      model?: string;
      autoRunAll?: boolean;
    };

    if (!body.projectId || !body.prompt) {
      return NextResponse.json({ error: "projectId and prompt are required" }, { status: 400 });
    }

    let run = createOrchestrationRun(body.projectId, body.prompt);
    run = await executeOrchestrationStep(run.id, body.providerId, body.model);

    if (body.autoRunAll) {
      let guard = 0;
      while (run.status === "in_progress" && guard < run.maxIterations) {
        guard += 1;
        run = await executeOrchestrationStep(run.id, body.providerId, body.model);
      }
    }

    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start orchestration" },
      { status: 500 }
    );
  }
}
