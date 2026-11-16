import { NextRequest, NextResponse } from "next/server";
import { resolveIntegrationToken } from "@/server/repositories/app-store";
import { getFileContent, getRepoTree, createOrUpdateFile } from "@/modules/github/client";
import { compareRepoInstructionFiles, createCustomSkill } from "@/modules/skills/engine";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action: "detect" | "import" | "export";
      repoFullName: string;
      branch?: string;
      filePath?: string;
      content?: string;
    };

    const token = resolveIntegrationToken("github");
    if (!token) {
      return NextResponse.json(
        { error: "GitHub is not connected. Connect GitHub in Integrations first." },
        { status: 400 }
      );
    }

    const branch = body.branch ?? "main";

    if (body.action === "detect") {
      const tree = await getRepoTree(token, body.repoFullName, branch);
      const instructionPaths = tree.tree
        .filter(
          (item) =>
            item.type === "blob" &&
            (/(^|\/)SKILL\.md$/i.test(item.path) ||
              /(^|\/)skills\.md$/i.test(item.path) ||
              /(^|\/)AGENTS\.md$/i.test(item.path))
        )
        .slice(0, 20);

      const files = await Promise.all(
        instructionPaths.map(async (f) => {
          const file = await getFileContent(token, body.repoFullName, f.path, branch);
          return { path: file.path, content: file.content };
        })
      );

      const comparisons = compareRepoInstructionFiles(files);
      return NextResponse.json({ comparisons });
    }

    if (body.action === "import" && body.filePath && body.content) {
      const slug = body.filePath
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      const skill = createCustomSkill({
        name: `Synced: ${body.filePath}`,
        slug: slug || "synced-skill",
        category: "custom",
        description: `Imported from ${body.repoFullName}/${body.filePath}`,
        applicableAgents: ["architect", "developer"],
        contentMd: body.content,
      });
      return NextResponse.json({ skill });
    }

    if (body.action === "export" && body.filePath && body.content) {
      let existingSha: string | undefined;
      try {
        const existing = await getFileContent(token, body.repoFullName, body.filePath, branch);
        existingSha = existing.sha;
      } catch {
        // New file
      }
      const res = await createOrUpdateFile(token, body.repoFullName, {
        path: body.filePath,
        content: body.content,
        message: `chore(remotechat): sync skill ${body.filePath}`,
        branch,
        sha: existingSha,
      });
      return NextResponse.json({ commit: res.commit });
    }

    return NextResponse.json({ error: "Invalid sync action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Skill sync failed" },
      { status: 500 }
    );
  }
}
