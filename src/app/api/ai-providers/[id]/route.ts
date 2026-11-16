import { NextRequest, NextResponse } from "next/server";
import { getAppState, sanitizeProviderForClient, saveAppState } from "@/server/repositories/app-store";
import { encryptSecret, maskSecret } from "@/lib/encryption/crypto";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as {
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    defaultModel?: string;
    isDefault?: boolean;
  };
  const state = getAppState();
  const provider = state.providers.find((p) => p.id === id);
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  if (body.isDefault) {
    state.providers.forEach((p) => {
      p.isDefault = false;
    });
    provider.isDefault = true;
  }
  if (body.name) provider.name = body.name;
  if (body.baseUrl) provider.baseUrl = body.baseUrl.replace(/\/+$/, "");
  if (body.defaultModel) provider.defaultModel = body.defaultModel;
  if (body.apiKey && body.apiKey.trim().length >= 4) {
    provider.encryptedApiKey = encryptSecret(body.apiKey.trim());
    provider.maskedApiKey = maskSecret(body.apiKey.trim());
  }

  saveAppState(state);
  return NextResponse.json({ provider: sanitizeProviderForClient(provider) });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const state = getAppState();
  const idx = state.providers.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  state.providers.splice(idx, 1);
  if (state.providers.length > 0 && !state.providers.some((p) => p.isDefault)) {
    state.providers[0].isDefault = true;
  }
  saveAppState(state);
  return NextResponse.json({ deleted: true });
}
