import { describe, expect, it } from "vitest";
import {
  compareRepoInstructionFiles,
  loadBuiltinAgents,
  loadBuiltinSkills,
} from "./engine";

describe("RemoteChat Skills & Agents Engine", () => {
  it("loads all 5 built-in agent definitions", () => {
    const agents = loadBuiltinAgents();
    expect(agents.length).toBe(5);
    const ids = agents.map((a) => a.id);
    expect(ids).toContain("architect");
    expect(ids).toContain("developer");
    expect(ids).toContain("qa");
    expect(ids).toContain("reviewer");
    expect(ids).toContain("orchestrator");
  });

  it("loads all 20 built-in SKILL.md definitions", () => {
    const skills = loadBuiltinSkills();
    expect(skills.length).toBe(20);
  });

  it("compares repository instruction files without overwriting", () => {
    const comparisons = compareRepoInstructionFiles([
      { path: "AGENTS.md", content: "# Custom repo agents" },
      { path: "skills/project-analysis/SKILL.md", content: "modified content" },
    ]);
    expect(comparisons[0].status).toBe("new_in_repo");
    expect(comparisons[1].status).toBe("modified");
  });
});
