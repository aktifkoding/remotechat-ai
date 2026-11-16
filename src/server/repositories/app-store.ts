import fs from "fs";
import path from "path";
import crypto from "crypto";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/encryption/crypto";
import type {
  AiProviderPublic,
  ApprovalRequest,
  CloudJob,
  OrchestrationRun,
  Project,
  SdlcPhaseRecord,
  SkillDefinition,
} from "@/types";

export interface StoredProvider extends AiProviderPublic {
  encryptedApiKey: string;
  customHeaders?: Record<string, string>;
}

export interface StoredIntegration {
  provider: "github" | "supabase" | "vercel";
  accountLabel: string;
  encryptedToken: string;
  maskedToken: string;
  status: "connected" | "error";
  connectedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  actorType: "user" | "agent" | "system";
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AppState {
  projects: Project[];
  providers: StoredProvider[];
  integrations: Record<"github" | "supabase" | "vercel", StoredIntegration | null>;
  customSkills: SkillDefinition[];
  orchestrationRuns: OrchestrationRun[];
  sdlcPhasesByProject: Record<string, SdlcPhaseRecord[]>;
  approvals: ApprovalRequest[];
  cloudJobs: CloudJob[];
  usageLogs: Array<{
    id: string;
    projectId: string;
    providerId: string;
    agentId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
    createdAt: string;
  }>;
  auditLogs: AuditEntry[];
}

const DATA_DIR = path.join(process.cwd(), ".remotechat-data");
const DATA_FILE = path.join(DATA_DIR, "state.json");

function defaultSdlcPhases(): SdlcPhaseRecord[] {
  return [
    { phaseKey: "discovery", phaseOrder: 1, responsibleAgent: "architect", status: "pending", progress: 0, approvalStatus: "not_required" },
    { phaseKey: "planning", phaseOrder: 2, responsibleAgent: "architect", status: "pending", progress: 0, approvalStatus: "not_required" },
    { phaseKey: "development", phaseOrder: 3, responsibleAgent: "developer", status: "pending", progress: 0, approvalStatus: "not_required" },
    { phaseKey: "testing", phaseOrder: 4, responsibleAgent: "qa", status: "pending", progress: 0, approvalStatus: "not_required" },
    { phaseKey: "review", phaseOrder: 5, responsibleAgent: "reviewer", status: "pending", progress: 0, approvalStatus: "not_required" },
    { phaseKey: "integration", phaseOrder: 6, responsibleAgent: "orchestrator", status: "pending", progress: 0, approvalStatus: "pending" },
    { phaseKey: "deployment", phaseOrder: 7, responsibleAgent: "orchestrator", status: "pending", progress: 0, approvalStatus: "pending" },
    { phaseKey: "monitoring", phaseOrder: 8, responsibleAgent: "architect", status: "pending", progress: 0, approvalStatus: "not_required" },
  ];
}

function createInitialState(): AppState {
  const defaultProjectId = "proj-remotechat-core";
  return {
    projects: [
      {
        id: defaultProjectId,
        workspaceId: "ws-default",
        name: "RemoteChat Workspace",
        slug: "remotechat-workspace",
        description: "Primary cloud engineering workspace for fullstack development.",
        framework: "Next.js 15 + TypeScript",
        defaultBranch: "main",
        activeBranch: "main",
        status: "active",
        githubRepoFullName: null,
        supabaseProjectRef: null,
        vercelProjectId: null,
        vercelPreviewUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    providers: [],
    integrations: {
      github: null,
      supabase: null,
      vercel: null,
    },
    customSkills: [],
    orchestrationRuns: [],
    sdlcPhasesByProject: {
      [defaultProjectId]: defaultSdlcPhases(),
    },
    approvals: [],
    cloudJobs: [],
    usageLogs: [],
    auditLogs: [],
  };
}

let memoryState: AppState | null = null;

export function getAppState(): AppState {
  if (memoryState) return memoryState;
  try {
    if (process.env.NODE_ENV !== "test" && fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      memoryState = JSON.parse(raw) as AppState;
      return memoryState;
    }
  } catch {
    // Fall back to fresh state if file is unreadable
  }
  memoryState = createInitialState();
  return memoryState;
}

export function saveAppState(state: AppState): void {
  memoryState = state;
  if (process.env.NODE_ENV === "test") return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Ignore disk write errors in read-only serverless environments
  }
}

export function resetAppStateForTests(): void {
  memoryState = createInitialState();
}

export function sanitizeProviderForClient(p: StoredProvider): AiProviderPublic {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    name: p.name,
    providerType: p.providerType,
    baseUrl: p.baseUrl,
    maskedApiKey: p.maskedApiKey,
    defaultModel: p.defaultModel,
    isDefault: p.isDefault,
    fallbackProviderId: p.fallbackProviderId,
    status: p.status,
    lastTestedAt: p.lastTestedAt,
    config: p.config,
    createdAt: p.createdAt,
  };
}

export function addEncryptedProvider(input: {
  name: string;
  providerType: "openai_compatible" | "anthropic_compatible" | "custom";
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  isDefault: boolean;
  contextWindow: number;
  maxOutputTokens: number;
  temperature: number;
  topP: number;
  timeoutMs: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  customHeaders?: Record<string, string>;
}): AiProviderPublic {
  const state = getAppState();
  if (input.isDefault) {
    state.providers.forEach((p) => {
      p.isDefault = false;
    });
  }
  const provider: StoredProvider = {
    id: `prov-${crypto.randomUUID().slice(0, 8)}`,
    workspaceId: "ws-default",
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl.replace(/\/+$/, ""),
    encryptedApiKey: encryptSecret(input.apiKey),
    maskedApiKey: maskSecret(input.apiKey),
    defaultModel: input.defaultModel,
    isDefault: input.isDefault || state.providers.length === 0,
    fallbackProviderId: null,
    status: "untested",
    lastTestedAt: null,
    config: {
      contextWindow: input.contextWindow,
      maxOutputTokens: input.maxOutputTokens,
      temperature: input.temperature,
      topP: input.topP,
      timeoutMs: input.timeoutMs,
      supportsStreaming: input.supportsStreaming,
      supportsTools: input.supportsTools,
    },
    customHeaders: input.customHeaders,
    createdAt: new Date().toISOString(),
  };
  state.providers.push(provider);
  state.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    actorType: "user",
    action: "ai_provider.created",
    resourceType: "ai_provider",
    resourceId: provider.id,
    metadata: { name: provider.name, baseUrl: provider.baseUrl },
    createdAt: new Date().toISOString(),
  });
  saveAppState(state);
  return sanitizeProviderForClient(provider);
}

export function resolveProviderSecret(providerId?: string): {
  provider: StoredProvider;
  apiKey: string;
} | null {
  const state = getAppState();
  const provider =
    (providerId ? state.providers.find((p) => p.id === providerId) : undefined) ??
    state.providers.find((p) => p.isDefault) ??
    state.providers[0];
  if (!provider) return null;
  return {
    provider,
    apiKey: decryptSecret(provider.encryptedApiKey),
  };
}

export function saveIntegrationToken(
  provider: "github" | "supabase" | "vercel",
  accountLabel: string,
  token: string,
  metadata: Record<string, unknown> = {}
): Omit<StoredIntegration, "encryptedToken"> {
  const state = getAppState();
  const stored: StoredIntegration = {
    provider,
    accountLabel,
    encryptedToken: encryptSecret(token),
    maskedToken: maskSecret(token),
    status: "connected",
    connectedAt: new Date().toISOString(),
    metadata,
  };
  state.integrations[provider] = stored;
  state.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    actorType: "user",
    action: `integration.${provider}.connected`,
    resourceType: "integration",
    resourceId: provider,
    metadata: { accountLabel },
    createdAt: new Date().toISOString(),
  });
  saveAppState(state);
  const { encryptedToken: _omit, ...safe } = stored;
  return safe;
}

export function resolveIntegrationToken(provider: "github" | "supabase" | "vercel"): string | null {
  const state = getAppState();
  const entry = state.integrations[provider];
  if (!entry) return null;
  return decryptSecret(entry.encryptedToken);
}

export function ensureProjectSdlcPhases(projectId: string): SdlcPhaseRecord[] {
  const state = getAppState();
  if (!state.sdlcPhasesByProject[projectId]) {
    state.sdlcPhasesByProject[projectId] = defaultSdlcPhases();
    saveAppState(state);
  }
  return state.sdlcPhasesByProject[projectId];
}
