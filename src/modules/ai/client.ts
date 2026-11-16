import { validateExternalUrl } from "@/lib/security/ssrf";
import { redactSecrets } from "@/lib/encryption/crypto";

export interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
}

export interface OpenAiToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface CompletionOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: OpenAiMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeoutMs?: number;
  tools?: OpenAiToolDef[];
  customHeaders?: Record<string, string>;
}

export interface CompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

function buildCompletionsEndpoint(baseUrl: string): { ok: true; endpoint: string } | { ok: false; error: string } {
  const urlCheck = validateExternalUrl(baseUrl);
  if (!urlCheck.valid || !urlCheck.normalized) {
    return { ok: false, error: urlCheck.reason ?? "Invalid provider Base URL" };
  }
  const cleanBase = urlCheck.normalized.replace(/\/chat\/completions$/i, "");
  return { ok: true, endpoint: `${cleanBase}/chat/completions` };
}

export async function testProviderConnection(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  testPrompt?: string;
}): Promise<{
  ok: boolean;
  latencyMs: number;
  model: string;
  reply?: string;
  error?: string;
}> {
  const built = buildCompletionsEndpoint(params.baseUrl);
  if (!built.ok) {
    return { ok: false, latencyMs: 0, model: params.model, error: built.error };
  }

  const start = Date.now();
  const endpoint = built.endpoint;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: "user",
            content: params.testPrompt ?? "Reply with 'RemoteChat AI connection verified.'",
          },
        ],
        max_tokens: 48,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        latencyMs,
        model: params.model,
        error: redactSecrets(`HTTP ${res.status}: ${errText.slice(0, 300)}`, [params.apiKey]),
      };
    }

    const json = (await res.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = json.choices?.[0]?.message?.content ?? "OK";

    return {
      ok: true,
      latencyMs,
      model: json.model ?? params.model,
      reply,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      model: params.model,
      error: redactSecrets(err instanceof Error ? err.message : "Connection failed", [params.apiKey]),
    };
  }
}

export async function runChatCompletion(opts: CompletionOptions): Promise<CompletionResult> {
  const built = buildCompletionsEndpoint(opts.baseUrl);
  if (!built.ok) {
    throw new Error(built.error);
  }

  const endpoint = built.endpoint;
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);

      const payload: Record<string, unknown> = {
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 4096,
      };
      if (opts.topP !== undefined && opts.topP !== 1) {
        payload.top_p = opts.topP;
      }
      if (opts.tools && opts.tools.length > 0) {
        payload.tools = opts.tools;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
          ...(opts.customHeaders ?? {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        if (
          res.status === 400 &&
          text.includes("max_completion_tokens") &&
          payload.max_tokens !== undefined
        ) {
          const retryPayload: Record<string, unknown> = {
            ...payload,
            max_completion_tokens: payload.max_tokens,
          };
          delete retryPayload.max_tokens;
          const retryRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${opts.apiKey}`,
              ...(opts.customHeaders ?? {}),
            },
            body: JSON.stringify(retryPayload),
          });
          if (retryRes.ok) {
            const retryData = (await retryRes.json()) as {
              model?: string;
              choices?: Array<{
                message?: {
                  content?: string | null;
                  reasoning_content?: string | null;
                };
              }>;
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                total_tokens?: number;
              };
            };
            const rMsg = retryData.choices?.[0]?.message;
            const pTok = retryData.usage?.prompt_tokens ?? 0;
            const cTok = retryData.usage?.completion_tokens ?? 0;
            return {
              content: rMsg?.content || rMsg?.reasoning_content || "",
              model: retryData.model ?? opts.model,
              promptTokens: pTok,
              completionTokens: cTok,
              totalTokens: retryData.usage?.total_tokens ?? pTok + cTok,
              latencyMs: Date.now() - start,
            };
          }
        }
        if (res.status >= 500 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(redactSecrets(`AI Provider HTTP ${res.status}: ${text.slice(0, 300)}`, [opts.apiKey]));
      }

      const data = (await res.json()) as {
        model?: string;
        choices?: Array<{
          message?: {
            content?: string | null;
            reasoning_content?: string | null;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const msg = data.choices?.[0]?.message;
      const parsedToolCalls = msg?.tool_calls?.map((tc) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        return {
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        };
      });

      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;

      return {
        content: msg?.content || msg?.reasoning_content || "",
        model: data.model ?? opts.model,
        promptTokens,
        completionTokens,
        totalTokens: data.usage?.total_tokens ?? promptTokens + completionTokens,
        latencyMs: Date.now() - start,
        toolCalls: parsedToolCalls,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("AI request failed");
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(redactSecrets(lastError?.message ?? "AI request failed", [opts.apiKey]));
}
