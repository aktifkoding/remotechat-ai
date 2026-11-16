import { z } from "zod";

export const createProviderSchema = z.object({
  name: z.string().min(2).max(80),
  providerType: z.enum(["openai_compatible", "anthropic_compatible", "custom"]).default("openai_compatible"),
  baseUrl: z.string().url(),
  apiKey: z.string().min(4),
  defaultModel: z.string().min(1).max(120),
  isDefault: z.boolean().default(false),
  contextWindow: z.number().int().min(1024).max(2000000).default(128000),
  maxOutputTokens: z.number().int().min(128).max(128000).default(4096),
  temperature: z.number().min(0).max(2).default(0.2),
  topP: z.number().min(0).max(1).default(1),
  timeoutMs: z.number().int().min(5000).max(300000).default(60000),
  supportsStreaming: z.boolean().default(true),
  supportsTools: z.boolean().default(true),
  customHeaders: z.record(z.string()).optional(),
});

export const testProviderSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(4),
  model: z.string().min(1),
  testPrompt: z.string().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  framework: z.string().max(60).optional(),
  githubRepoFullName: z.string().optional(),
  defaultBranch: z.string().default("main"),
});

export const chatRequestSchema = z.object({
  projectId: z.string().min(1),
  conversationId: z.string().optional(),
  message: z.string().min(1),
  providerId: z.string().optional(),
  model: z.string().optional(),
  branch: z.string().optional(),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().max(500).optional(),
});

export const createSkillSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  category: z.enum(["core", "development", "quality", "architecture", "deployment", "custom"]),
  description: z.string().min(4).max(300),
  applicableAgents: z.array(z.enum(["architect", "developer", "qa", "reviewer", "orchestrator"])),
  contentMd: z.string().min(10),
});
