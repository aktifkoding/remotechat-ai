export type TaskStatus =
  | "pending"
  | "queued"
  | "in_progress"
  | "blocked"
  | "needs_approval"
  | "failed"
  | "completed"
  | "cancelled";

export type AgentId = "architect" | "developer" | "qa" | "reviewer" | "orchestrator";

export type SdlcPhaseKey =
  | "discovery"
  | "planning"
  | "development"
  | "testing"
  | "review"
  | "integration"
  | "deployment"
  | "monitoring";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  monthlyTokenLimit: number;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  framework: string | null;
  defaultBranch: string;
  activeBranch: string;
  status: "active" | "archived";
  githubRepoFullName?: string | null;
  supabaseProjectRef?: string | null;
  vercelProjectId?: string | null;
  vercelPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiProviderPublic {
  id: string;
  workspaceId: string;
  name: string;
  providerType: "openai_compatible" | "anthropic_compatible" | "custom";
  baseUrl: string;
  maskedApiKey: string;
  defaultModel: string;
  isDefault: boolean;
  fallbackProviderId: string | null;
  status: "connected" | "error" | "untested";
  lastTestedAt: string | null;
  config: {
    contextWindow: number;
    maxOutputTokens: number;
    temperature: number;
    topP: number;
    timeoutMs: number;
    supportsStreaming: boolean;
    supportsTools: boolean;
  };
  createdAt: string;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  mention: string;
  role: string;
  description: string;
  systemInstructions: string;
  permissions: string[];
  isBuiltin: boolean;
}

export interface SkillDefinition {
  id: string;
  slug: string;
  name: string;
  category: "core" | "development" | "quality" | "architecture" | "deployment" | "custom";
  description: string;
  applicableAgents: AgentId[];
  triggers: string[];
  tools: string[];
  contentMd: string;
  isBuiltin: boolean;
  isActive: boolean;
  version: number;
}

export interface OrchestrationTask {
  id: string;
  runId: string;
  stepOrder: number;
  agentId: AgentId;
  title: string;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  outputSummary?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface OrchestrationRun {
  id: string;
  projectId: string;
  triggerPrompt: string;
  status: TaskStatus;
  currentStep: number;
  maxIterations: number;
  totalTokens: number;
  errorMessage?: string | null;
  tasks: OrchestrationTask[];
  events: Array<{
    id: string;
    eventType: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
  completedAt?: string | null;
}

export interface SdlcPhaseRecord {
  phaseKey: SdlcPhaseKey;
  phaseOrder: number;
  responsibleAgent: AgentId;
  status: TaskStatus;
  progress: number;
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface ApprovalRequest {
  id: string;
  projectId: string;
  orchestrationRunId?: string | null;
  requestedByAgent: AgentId;
  actionType: "merge_production" | "db_migration" | "deploy_production" | "delete_resource" | "pr_create";
  title: string;
  description: string;
  payload: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
}

export interface CloudJob {
  id: string;
  projectId: string;
  repository: string;
  branch: string;
  command: string;
  runner: "github_actions" | "vercel" | "supabase_edge";
  externalJobId?: string | null;
  status: "queued" | "in_progress" | "completed" | "failed" | "cancelled";
  exitCode?: number | null;
  logs: Array<{ stream: "stdout" | "stderr" | "system"; content: string; createdAt: string }>;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  agentId?: AgentId | null;
  content: string;
  toolCalls?: Array<{
    id: string;
    toolName: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    status: "running" | "completed" | "failed";
  }>;
  tokensUsed?: number;
  createdAt: string;
}
