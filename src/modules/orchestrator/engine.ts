import crypto from "crypto";
import type { AgentId, OrchestrationRun, OrchestrationTask } from "@/types";
import {
  ensureProjectSdlcPhases,
  getAppState,
  resolveProviderSecret,
  saveAppState,
} from "@/server/repositories/app-store";
import { loadBuiltinAgents } from "@/modules/skills/engine";
import { runChatCompletion } from "@/modules/ai/client";

export function detectTargetAgent(prompt: string): AgentId {
  const lower = prompt.toLowerCase();
  if (lower.includes("@architect")) return "architect";
  if (lower.includes("@developer")) return "developer";
  if (lower.includes("@qa")) return "qa";
  if (lower.includes("@reviewer")) return "reviewer";
  return "orchestrator";
}

export function checkAgentPermission(agentId: AgentId, requiredPermission: string): boolean {
  const agents = loadBuiltinAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return false;
  return agent.permissions.includes(requiredPermission);
}

export function createOrchestrationRun(projectId: string, triggerPrompt: string): OrchestrationRun {
  const state = getAppState();
  const target = detectTargetAgent(triggerPrompt);
  const runId = `run-${crypto.randomUUID().slice(0, 8)}`;

  const tasks: OrchestrationTask[] =
    target === "orchestrator"
      ? [
          {
            id: `task-${crypto.randomUUID().slice(0, 8)}`,
            runId,
            stepOrder: 1,
            agentId: "architect",
            title: "Requirement Analysis & System Architecture Plan",
            status: "queued",
            retryCount: 0,
            maxRetries: 2,
          },
          {
            id: `task-${crypto.randomUUID().slice(0, 8)}`,
            runId,
            stepOrder: 2,
            agentId: "developer",
            title: "Fullstack Implementation & File Changes",
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
          },
          {
            id: `task-${crypto.randomUUID().slice(0, 8)}`,
            runId,
            stepOrder: 3,
            agentId: "qa",
            title: "Test Plan & Cloud Test Verification",
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
          },
          {
            id: `task-${crypto.randomUUID().slice(0, 8)}`,
            runId,
            stepOrder: 4,
            agentId: "reviewer",
            title: "Independent Code & Security Review",
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
          },
          {
            id: `task-${crypto.randomUUID().slice(0, 8)}`,
            runId,
            stepOrder: 5,
            agentId: "orchestrator",
            title: "Integration Approval, PR & Vercel Preview",
            status: "pending",
            retryCount: 0,
            maxRetries: 1,
          },
        ]
      : [
          {
            id: `task-${crypto.randomUUID().slice(0, 8)}`,
            runId,
            stepOrder: 1,
            agentId: target,
            title: `Direct Execution by @${target}`,
            status: "queued",
            retryCount: 0,
            maxRetries: 2,
          },
        ];

  const run: OrchestrationRun = {
    id: runId,
    projectId,
    triggerPrompt,
    status: "in_progress",
    currentStep: 1,
    maxIterations: 12,
    totalTokens: 0,
    tasks,
    events: [
      {
        id: `evt-${crypto.randomUUID().slice(0, 8)}`,
        eventType: "run.started",
        message: `Orchestration started (${tasks.length} step${tasks.length > 1 ? "s" : ""})`,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };

  state.orchestrationRuns.unshift(run);
  saveAppState(state);
  return run;
}

export async function executeOrchestrationStep(
  runId: string,
  providerId?: string,
  modelOverride?: string,
  repoContext = ""
): Promise<OrchestrationRun> {
  const state = getAppState();
  const run = state.orchestrationRuns.find((r) => r.id === runId);
  if (!run) throw new Error("Orchestration run not found");
  if (run.status === "cancelled") return run;

  const resolved = resolveProviderSecret(providerId);
  if (!resolved) {
    run.status = "blocked";
    run.errorMessage = "No AI Provider configured. Add an OpenAI-compatible provider in AI Providers.";
    run.events.push({
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      eventType: "run.blocked",
      message: run.errorMessage,
      createdAt: new Date().toISOString(),
    });
    saveAppState(state);
    return run;
  }

  const agents = loadBuiltinAgents();
  const phases = ensureProjectSdlcPhases(run.projectId);
  const activeTask = run.tasks.find((t) => t.status === "queued" || t.status === "pending");

  if (!activeTask) {
    run.status = "completed";
    run.completedAt = new Date().toISOString();
    saveAppState(state);
    return run;
  }

  activeTask.status = "in_progress";
  activeTask.startedAt = new Date().toISOString();
  run.currentStep = activeTask.stepOrder;
  saveAppState(state);

  const agent = agents.find((a) => a.id === activeTask.agentId);
  const model = modelOverride || resolved.provider.defaultModel;

  try {
    const previousOutputs = run.tasks
      .filter((t) => t.status === "completed" && t.outputSummary)
      .map((t) => `[Step ${t.stepOrder} - @${t.agentId}]:\n${t.outputSummary}`)
      .join("\n\n");

    const systemPrompt = [
      agent?.systemInstructions ?? `You are @${activeTask.agentId}.`,
      `Allowed permissions: ${(agent?.permissions ?? []).join(", ")}`,
      repoContext ? `Repository Context:\n${repoContext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const userPrompt = [
      `User Request: ${run.triggerPrompt}`,
      `Current Task: ${activeTask.title}`,
      previousOutputs ? `Previous Agent Outputs:\n${previousOutputs}` : "",
      `Provide a concrete, actionable engineering output for your role.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await runChatCompletion({
      baseUrl: resolved.provider.baseUrl,
      apiKey: resolved.apiKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: resolved.provider.config.temperature,
      maxTokens: resolved.provider.config.maxOutputTokens,
      topP: resolved.provider.config.topP,
      timeoutMs: resolved.provider.config.timeoutMs,
      customHeaders: resolved.provider.customHeaders,
    });

    activeTask.status = "completed";
    activeTask.completedAt = new Date().toISOString();
    activeTask.outputSummary = result.content;
    run.totalTokens += result.totalTokens;

    state.usageLogs.unshift({
      id: `usg-${crypto.randomUUID().slice(0, 8)}`,
      projectId: run.projectId,
      providerId: resolved.provider.id,
      agentId: activeTask.agentId,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: Number(((result.totalTokens / 1_000_000) * 1.5).toFixed(6)),
      latencyMs: result.latencyMs,
      createdAt: new Date().toISOString(),
    });

    // Advance matching SDLC phase
    const phaseMap: Record<AgentId, string> = {
      architect: "planning",
      developer: "development",
      qa: "testing",
      reviewer: "review",
      orchestrator: "integration",
    };
    const phase = phases.find((p) => p.phaseKey === phaseMap[activeTask.agentId]);
    if (phase) {
      phase.status = activeTask.agentId === "orchestrator" ? "needs_approval" : "completed";
      phase.progress = activeTask.agentId === "orchestrator" ? 80 : 100;
      phase.completedAt = new Date().toISOString();
    }

    if (activeTask.agentId === "orchestrator") {
      state.approvals.unshift({
        id: `apr-${crypto.randomUUID().slice(0, 8)}`,
        projectId: run.projectId,
        orchestrationRunId: run.id,
        requestedByAgent: "orchestrator",
        actionType: "pr_create",
        title: "Approve Pull Request & Preview Deployment",
        description: `Ready to create Pull Request and trigger Vercel Preview Deployment for: ${run.triggerPrompt.slice(0, 120)}`,
        payload: { runId: run.id },
        riskLevel: "medium",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    run.events.push({
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      eventType: "task.completed",
      message: `@${activeTask.agentId} completed "${activeTask.title}" (${result.totalTokens} tokens)`,
      createdAt: new Date().toISOString(),
    });

    const nextTask = run.tasks.find((t) => t.status === "pending");
    if (nextTask) {
      nextTask.status = "queued";
    } else {
      run.status = "completed";
      run.completedAt = new Date().toISOString();
    }

    saveAppState(state);
    return run;
  } catch (err) {
    activeTask.retryCount += 1;
    activeTask.status = activeTask.retryCount <= activeTask.maxRetries ? "queued" : "failed";
    run.status = activeTask.status === "failed" ? "failed" : "in_progress";
    run.errorMessage = err instanceof Error ? err.message : "Agent execution error";
    run.events.push({
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      eventType: "task.error",
      message: `@${activeTask.agentId} error: ${run.errorMessage}`,
      createdAt: new Date().toISOString(),
    });
    saveAppState(state);
    return run;
  }
}

export function cancelOrchestrationRun(runId: string): OrchestrationRun | null {
  const state = getAppState();
  const run = state.orchestrationRuns.find((r) => r.id === runId);
  if (!run) return null;
  run.status = "cancelled";
  run.tasks.forEach((t) => {
    if (t.status === "pending" || t.status === "queued" || t.status === "in_progress") {
      t.status = "cancelled";
    }
  });
  run.events.push({
    id: `evt-${crypto.randomUUID().slice(0, 8)}`,
    eventType: "run.cancelled",
    message: "Orchestration run cancelled by user.",
    createdAt: new Date().toISOString(),
  });
  saveAppState(state);
  return run;
}
