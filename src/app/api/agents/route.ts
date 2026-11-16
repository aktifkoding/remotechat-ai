import { NextResponse } from "next/server";
import { loadBuiltinAgents } from "@/modules/skills/engine";
import { getAppState } from "@/server/repositories/app-store";

export async function GET() {
  const agents = loadBuiltinAgents();
  const state = getAppState();

  const stats = agents.map((agent) => {
    const logs = state.usageLogs.filter((u) => u.agentId === agent.id);
    const totalTokens = logs.reduce((acc, l) => acc + l.totalTokens, 0);
    return {
      ...agent,
      executionsCount: logs.length,
      totalTokens,
    };
  });

  return NextResponse.json({ agents: stats });
}
