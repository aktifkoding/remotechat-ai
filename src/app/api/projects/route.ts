import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createProjectSchema } from "@/lib/validators/schemas";
import { ensureProjectSdlcPhases, getAppState, saveAppState } from "@/server/repositories/app-store";

export async function GET() {
  const state = getAppState();
  return NextResponse.json({ projects: state.projects });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const state = getAppState();
    const id = `proj-${crypto.randomUUID().slice(0, 8)}`;
    const slug = parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const project = {
      id,
      workspaceId: "ws-default",
      name: parsed.data.name,
      slug: `${slug}-${id.slice(-4)}`,
      description: parsed.data.description ?? null,
      framework: parsed.data.framework ?? "Next.js",
      defaultBranch: parsed.data.defaultBranch,
      activeBranch: parsed.data.defaultBranch,
      status: "active" as const,
      githubRepoFullName: parsed.data.githubRepoFullName ?? null,
      supabaseProjectRef: null,
      vercelProjectId: null,
      vercelPreviewUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.projects.unshift(project);
    ensureProjectSdlcPhases(id);
    saveAppState(state);

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create project" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id: string;
      githubRepoFullName?: string;
      supabaseProjectRef?: string;
      vercelProjectId?: string;
      vercelPreviewUrl?: string;
      activeBranch?: string;
    };
    const state = getAppState();
    const project = state.projects.find((p) => p.id === body.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (body.githubRepoFullName !== undefined) project.githubRepoFullName = body.githubRepoFullName;
    if (body.supabaseProjectRef !== undefined) project.supabaseProjectRef = body.supabaseProjectRef;
    if (body.vercelProjectId !== undefined) project.vercelProjectId = body.vercelProjectId;
    if (body.vercelPreviewUrl !== undefined) project.vercelPreviewUrl = body.vercelPreviewUrl;
    if (body.activeBranch !== undefined) project.activeBranch = body.activeBranch;
    project.updatedAt = new Date().toISOString();
    saveAppState(state);
    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update project" },
      { status: 500 }
    );
  }
}
