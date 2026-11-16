import { NextRequest, NextResponse } from "next/server";
import { getAppState, resolveIntegrationToken } from "@/server/repositories/app-store";
import { listWorkflowRuns } from "@/modules/github/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? "proj-remotechat-core";
  const state = getAppState();
  const project = state.projects.find((p) => p.id === projectId);
  const token = resolveIntegrationToken("github");

  let githubRuns: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    head_branch: string;
    html_url: string;
    created_at: string;
  }> = [];

  if (token && project?.githubRepoFullName) {
    try {
      const res = await listWorkflowRuns(token, project.githubRepoFullName);
      githubRuns = res.workflow_runs;
    } catch {
      // Ignore if repo has no Actions or permissions
    }
  }

  return NextResponse.json({
    jobs: state.cloudJobs.filter((j) => j.projectId === projectId),
    githubActionsRuns: githubRuns,
  });
}
