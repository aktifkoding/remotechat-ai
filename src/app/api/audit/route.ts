import { NextResponse } from "next/server";
import { getAppState } from "@/server/repositories/app-store";

export async function GET() {
  const state = getAppState();
  return NextResponse.json({
    auditLogs: state.auditLogs.slice(0, 100),
    usageLogs: state.usageLogs.slice(0, 100),
  });
}
