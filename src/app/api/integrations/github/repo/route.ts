import { NextRequest, NextResponse } from "next/server";
import { resolveIntegrationToken } from "@/server/repositories/app-store";
import {
  createBranch,
  createOrUpdateFile,
  createPullRequest,
  getFileContent,
  getRepoTree,
  listBranches,
  listCommits,
  listPullRequests,
} from "@/modules/github/client";

export async function GET(req: NextRequest) {
  try {
    const token = resolveIntegrationToken("github");
    if (!token) {
      return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get("repo");
    const branch = searchParams.get("branch") ?? "main";
    const filePath = searchParams.get("path");
    const mode = searchParams.get("mode");

    if (!repo) {
      return NextResponse.json({ error: "repo query param is required" }, { status: 400 });
    }

    if (filePath) {
      const file = await getFileContent(token, repo, filePath, branch);
      return NextResponse.json({ file });
    }

    if (mode === "activity") {
      const [commits, pulls] = await Promise.all([
        listCommits(token, repo, branch),
        listPullRequests(token, repo),
      ]);
      return NextResponse.json({ commits, pulls });
    }

    const [branches, tree] = await Promise.all([
      listBranches(token, repo),
      getRepoTree(token, repo, branch),
    ]);

    return NextResponse.json({
      branches,
      tree: tree.tree.slice(0, 400),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to inspect repository" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = resolveIntegrationToken("github");
    if (!token) {
      return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
    }

    const body = (await req.json()) as {
      action: "commit_file" | "create_branch" | "create_pr";
      repo: string;
      branch?: string;
      fromBranch?: string;
      path?: string;
      content?: string;
      message?: string;
      sha?: string;
      title?: string;
      body?: string;
      head?: string;
      base?: string;
    };

    if (body.action === "create_branch" && body.branch) {
      const res = await createBranch(token, body.repo, body.branch, body.fromBranch ?? "main");
      return NextResponse.json(res);
    }

    if (body.action === "commit_file" && body.path && body.content !== undefined && body.branch) {
      const res = await createOrUpdateFile(token, body.repo, {
        path: body.path,
        content: body.content,
        message: body.message ?? `chore: update ${body.path} via RemoteChat AI`,
        branch: body.branch,
        sha: body.sha,
      });
      return NextResponse.json(res);
    }

    if (body.action === "create_pr" && body.title && body.head && body.base) {
      const res = await createPullRequest(token, body.repo, {
        title: body.title,
        body: body.body ?? "Created by RemoteChat AI Engineering Team.",
        head: body.head,
        base: body.base,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Invalid GitHub repository action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GitHub operation failed" },
      { status: 500 }
    );
  }
}
