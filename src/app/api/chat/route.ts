import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validators/schemas";
import {
  getAppState,
  resolveIntegrationToken,
  resolveProviderSecret,
  saveAppState,
} from "@/server/repositories/app-store";
import {
  createOrchestrationRun,
  detectTargetAgent,
  executeOrchestrationStep,
} from "@/modules/orchestrator/engine";
import {
  type OpenAiMessage,
  type OpenAiToolDef,
  runChatCompletion,
} from "@/modules/ai/client";
import { loadBuiltinAgents } from "@/modules/skills/engine";
import {
  createBranch,
  createOrUpdateFile,
  createPullRequest,
  getFileContent,
  getRepoTree,
} from "@/modules/github/client";

const GITHUB_TOOLS: OpenAiToolDef[] = [
  {
    type: "function",
    function: {
      name: "read_github_file",
      description: "Read the current content and SHA of a file in the connected GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root, e.g. src/app/page.tsx" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "commit_github_file",
      description:
        "Create or update a file and immediately commit & push it to the active GitHub branch.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root" },
          content: { type: "string", description: "Full updated file content" },
          message: { type: "string", description: "Git commit message" },
          branch: { type: "string", description: "Target branch (optional, defaults to active branch)" },
        },
        required: ["path", "content", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_github_branch",
      description: "Create a new GitHub branch from the current active branch.",
      parameters: {
        type: "object",
        properties: {
          branch: { type: "string", description: "New branch name, e.g. feat/google-auth" },
        },
        required: ["branch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_pull_request",
      description: "Open a Pull Request on GitHub from head branch into base branch.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          head: { type: "string" },
          base: { type: "string" },
        },
        required: ["title", "head", "base"],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { projectId, message, providerId, model, branch } = parsed.data;
    const state = getAppState();
    const project = state.projects.find((p) => p.id === projectId);
    const resolved = resolveProviderSecret(providerId);

    if (!resolved) {
      return NextResponse.json(
        {
          error:
            "No AI Provider configured yet. Please add an OpenAI-compatible AI provider in AI Models settings.",
          code: "NO_AI_PROVIDER",
        },
        { status: 400 }
      );
    }

    const activeBranch = branch ?? project?.activeBranch ?? "main";
    const ghToken = resolveIntegrationToken("github");
    let repoContext = "";

    if (ghToken && project?.githubRepoFullName) {
      try {
        const tree = await getRepoTree(ghToken, project.githubRepoFullName, activeBranch);
        const paths = tree.tree
          .slice(0, 80)
          .map((t) => `${t.type === "tree" ? "[dir]" : "[file]"} ${t.path}`);
        repoContext = `Connected GitHub Repo: ${project.githubRepoFullName} (active branch: ${activeBranch})\nFiles:\n${paths.join("\n")}`;
      } catch {
        repoContext = `Connected GitHub Repo: ${project.githubRepoFullName} (active branch: ${activeBranch})`;
      }
    }

    const targetAgent = detectTargetAgent(message);

    if (targetAgent === "orchestrator" && message.toLowerCase().includes("@orchestrator")) {
      const run = createOrchestrationRun(projectId, message);
      const updatedRun = await executeOrchestrationStep(run.id, providerId, model, repoContext);
      const firstTask = updatedRun.tasks[0];

      return NextResponse.json({
        agentId: "orchestrator",
        orchestrationRun: updatedRun,
        reply: firstTask?.outputSummary
          ? `### Orchestration Run \`${updatedRun.id}\` Started\n\n**Step 1 (@${firstTask.agentId}):** ${firstTask.title}\n\n${firstTask.outputSummary}`
          : updatedRun.errorMessage ?? "Orchestration queued.",
        tokensUsed: updatedRun.totalTokens,
      });
    }

    const agents = loadBuiltinAgents();
    const agent = agents.find((a) => a.id === targetAgent);
    const chosenModel = model || resolved.provider.defaultModel;
    const canUseGitHubTools =
      Boolean(ghToken && project?.githubRepoFullName) && resolved.provider.config.supportsTools;

    const systemPrompt = [
      agent?.systemInstructions ?? "You are a senior AI software engineer in RemoteChat AI.",
      project ? `Active Project: ${project.name} (${project.framework ?? "Web App"})` : "",
      repoContext,
      canUseGitHubTools
        ? "You have live GitHub tools (read_github_file, commit_github_file, create_github_branch, create_pull_request). When asked to modify code, commit, or push, always read the target file first if it exists, then call commit_github_file to push the real commit to GitHub."
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const conversation: OpenAiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    const executedToolCalls: Array<{ toolName: string; summary: string }> = [];
    let totalTokens = 0;
    let totalLatency = 0;
    let finalReply = "";
    let finalModel = chosenModel;

    for (let step = 0; step < 6; step++) {
      let completion;
      try {
        completion = await runChatCompletion({
          baseUrl: resolved.provider.baseUrl,
          apiKey: resolved.apiKey,
          model: chosenModel,
          messages: conversation,
          temperature: resolved.provider.config.temperature,
          maxTokens: resolved.provider.config.maxOutputTokens,
          topP: resolved.provider.config.topP,
          timeoutMs: resolved.provider.config.timeoutMs,
          customHeaders: resolved.provider.customHeaders,
          tools: canUseGitHubTools ? GITHUB_TOOLS : undefined,
        });
      } catch (err) {
        // Fallback without tools if custom provider rejects tools parameter
        if (canUseGitHubTools && step === 0) {
          completion = await runChatCompletion({
            baseUrl: resolved.provider.baseUrl,
            apiKey: resolved.apiKey,
            model: chosenModel,
            messages: conversation,
            temperature: resolved.provider.config.temperature,
            maxTokens: resolved.provider.config.maxOutputTokens,
            topP: resolved.provider.config.topP,
            timeoutMs: resolved.provider.config.timeoutMs,
            customHeaders: resolved.provider.customHeaders,
          });
        } else {
          throw err;
        }
      }

      totalTokens += completion.totalTokens;
      totalLatency += completion.latencyMs;
      finalModel = completion.model;

      if (!completion.toolCalls || completion.toolCalls.length === 0 || !ghToken || !project?.githubRepoFullName) {
        finalReply = completion.content;
        break;
      }

      conversation.push({
        role: "assistant",
        content: completion.content || "Executing GitHub tools...",
      });

      for (const tc of completion.toolCalls) {
        let toolResultText = "";
        try {
          if (tc.name === "read_github_file") {
            const file = await getFileContent(
              ghToken,
              project.githubRepoFullName,
              String(tc.arguments.path ?? ""),
              activeBranch
            );
            toolResultText = JSON.stringify({ path: file.path, sha: file.sha, content: file.content });
            executedToolCalls.push({ toolName: tc.name, summary: `Read ${file.path}` });
          } else if (tc.name === "commit_github_file") {
            const targetPath = String(tc.arguments.path ?? "");
            const targetBranch = String(tc.arguments.branch ?? activeBranch);
            let existingSha: string | undefined;
            try {
              const existing = await getFileContent(
                ghToken,
                project.githubRepoFullName,
                targetPath,
                targetBranch
              );
              existingSha = existing.sha;
            } catch {
              // New file
            }
            const committed = await createOrUpdateFile(ghToken, project.githubRepoFullName, {
              path: targetPath,
              content: String(tc.arguments.content ?? ""),
              message: String(tc.arguments.message ?? `chore: update ${targetPath} via RemoteChat AI`),
              branch: targetBranch,
              sha: existingSha,
            });
            toolResultText = JSON.stringify({
              committed: true,
              path: targetPath,
              branch: targetBranch,
              sha: committed.commit.sha,
              url: committed.commit.html_url,
            });
            executedToolCalls.push({
              toolName: tc.name,
              summary: `Committed & pushed ${targetPath} (${committed.commit.sha.slice(0, 7)})`,
            });
          } else if (tc.name === "create_github_branch") {
            const newBranch = String(tc.arguments.branch ?? "");
            await createBranch(ghToken, project.githubRepoFullName, newBranch, activeBranch);
            toolResultText = JSON.stringify({ created: true, branch: newBranch });
            executedToolCalls.push({ toolName: tc.name, summary: `Created branch ${newBranch}` });
          } else if (tc.name === "create_pull_request") {
            const pr = await createPullRequest(ghToken, project.githubRepoFullName, {
              title: String(tc.arguments.title ?? "RemoteChat AI Update"),
              body: String(tc.arguments.body ?? "Automated PR from RemoteChat AI."),
              head: String(tc.arguments.head ?? activeBranch),
              base: String(tc.arguments.base ?? project.defaultBranch),
            });
            toolResultText = JSON.stringify({ prNumber: pr.number, url: pr.html_url });
            executedToolCalls.push({ toolName: tc.name, summary: `Opened PR #${pr.number}` });
          }
        } catch (toolErr) {
          toolResultText = JSON.stringify({
            error: toolErr instanceof Error ? toolErr.message : "Tool execution failed",
          });
          executedToolCalls.push({
            toolName: tc.name,
            summary: `Failed: ${toolErr instanceof Error ? toolErr.message : "error"}`,
          });
        }

        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResultText,
        });
      }
    }

    state.usageLogs.unshift({
      id: `usg-${crypto.randomUUID().slice(0, 8)}`,
      projectId,
      providerId: resolved.provider.id,
      agentId: targetAgent,
      model: finalModel,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens,
      estimatedCostUsd: Number(((totalTokens / 1_000_000) * 1.5).toFixed(6)),
      latencyMs: totalLatency,
      createdAt: new Date().toISOString(),
    });
    saveAppState(state);

    return NextResponse.json({
      agentId: targetAgent,
      reply: finalReply || executedToolCalls.map((t) => `- **${t.toolName}**: ${t.summary}`).join("\n"),
      model: finalModel,
      tokensUsed: totalTokens,
      latencyMs: totalLatency,
      toolCalls: executedToolCalls,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat execution failed" },
      { status: 500 }
    );
  }
}
