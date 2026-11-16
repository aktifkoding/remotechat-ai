import { NextRequest, NextResponse } from "next/server";
import { createProviderSchema } from "@/lib/validators/schemas";
import { validateExternalUrl } from "@/lib/security/ssrf";
import {
  addEncryptedProvider,
  getAppState,
  sanitizeProviderForClient,
} from "@/server/repositories/app-store";

export async function GET() {
  const state = getAppState();
  return NextResponse.json({
    providers: state.providers.map(sanitizeProviderForClient),
    usageLogs: state.usageLogs.slice(0, 50),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const urlCheck = validateExternalUrl(parsed.data.baseUrl);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.reason }, { status: 400 });
    }

    const provider = addEncryptedProvider(parsed.data);
    return NextResponse.json({ provider }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save provider" },
      { status: 500 }
    );
  }
}
