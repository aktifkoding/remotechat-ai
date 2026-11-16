import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelOrchestrationRun,
  checkAgentPermission,
  createOrchestrationRun,
  detectTargetAgent,
  executeOrchestrationStep,
} from "./engine";
import { resetAppStateForTests } from "@/server/repositories/app-store";

describe("RemoteChat Agent Orchestrator", () => {
  beforeEach(() => {
    resetAppStateForTests();
  });

  it("routes @mentions to the correct built-in agent", () => {
    expect(detectTargetAgent("@architect Design the DB")).toBe("architect");
    expect(detectTargetAgent("@developer Implement OAuth")).toBe("developer");
    expect(detectTargetAgent("@qa Run regression tests")).toBe("qa");
    expect(detectTargetAgent("@reviewer Audit this PR")).toBe("reviewer");
    expect(detectTargetAgent("@orchestrator Build full app")).toBe("orchestrator");
  });

  it("enforces distinct permissions per agent", () => {
    expect(checkAgentPermission("architect", "github:write_file")).toBe(false);
    expect(checkAgentPermission("developer", "github:write_file")).toBe(true);
    expect(checkAgentPermission("qa", "execution:dispatch_ci")).toBe(true);
    expect(checkAgentPermission("reviewer", "github:submit_review")).toBe(true);
  });

  it("creates a 5-step pipeline for @orchestrator and blocks cleanly if no AI provider exists", async () => {
    const run = createOrchestrationRun("proj-remotechat-core", "@orchestrator Build Google OAuth");
    expect(run.tasks.length).toBe(5);
    const afterStep = await executeOrchestrationStep(run.id);
    expect(afterStep.status).toBe("blocked");
    expect(afterStep.errorMessage).toContain("No AI Provider configured");
  });

  it("cancels an active orchestration run", () => {
    const run = createOrchestrationRun("proj-remotechat-core", "@orchestrator Build dashboard");
    const cancelled = cancelOrchestrationRun(run.id);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.tasks.every((t) => t.status === "cancelled")).toBe(true);
  });
});
