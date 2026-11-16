import { NextRequest, NextResponse } from "next/server";
import { testProviderSchema } from "@/lib/validators/schemas";
import { testProviderConnection } from "@/modules/ai/client";
import { getAppState, resolveProviderSecret, saveAppState } from "@/server/repositories/app-store";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      providerId?: string;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      testPrompt?: string;
    };

    let baseUrl = body.baseUrl;
    let apiKey = body.apiKey;
    let model = body.model;

    if (body.providerId) {
      const resolved = resolveProviderSecret(body.providerId);
      if (!resolved) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      }
      baseUrl = resolved.provider.baseUrl;
      apiKey = resolved.apiKey;
      model = model ?? resolved.provider.defaultModel;
    }

    const parsed = testProviderSchema.safeParse({ baseUrl, apiKey, model, testPrompt: body.testPrompt });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await testProviderConnection(parsed.data);

    if (body.providerId) {
      const state = getAppState();
      const target = state.providers.find((p) => p.id === body.providerId);
      if (target) {
        target.status = result.ok ? "connected" : "error";
        target.lastTestedAt = new Date().toISOString();
        saveAppState(state);
      }
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Test failed" },
      { status: 500 }
    );
  }
}
