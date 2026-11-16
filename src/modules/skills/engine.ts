import fs from "fs";
import path from "path";
import type { AgentDefinition, AgentId, SkillDefinition } from "@/types";
import { getAppState, saveAppState } from "@/server/repositories/app-store";

function parseFrontmatter(raw: string): { meta: Record<string, string | string[]>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw };
  }
  const meta: Record<string, string | string[]> = {};
  let currentListKey: string | null = null;

  for (const line of match[1].split(/\r?\n/)) {
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentListKey) {
      const existing = meta[currentListKey];
      const item = listMatch[1].trim().replace(/^["']|["']$/g, "");
      if (Array.isArray(existing)) {
        existing.push(item);
      } else {
        meta[currentListKey] = [item];
      }
      continue;
    }

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!val) {
      currentListKey = key;
      meta[key] = [];
    } else if (val.startsWith("[") && val.endsWith("]")) {
      currentListKey = null;
      meta[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      currentListKey = null;
      meta[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { meta, body: match[2].trim() };
}

export function loadBuiltinAgents(): AgentDefinition[] {
  const agentsDir = path.join(process.cwd(), "remotechat", "agents");
  if (!fs.existsSync(agentsDir)) return [];

  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
  const results: AgentDefinition[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(agentsDir, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const id = (meta.id as AgentId) || (file.replace(".md", "") as AgentId);
    results.push({
      id,
      name: String(meta.name ?? id),
      mention: String(meta.mention ?? `@${id}`),
      role: String(meta.role ?? "AI Agent"),
      description: body.split("\n").find((l) => l.trim() && !l.startsWith("#")) ?? "",
      systemInstructions: body,
      permissions: Array.isArray(meta.permissions) ? meta.permissions : [],
      isBuiltin: true,
    });
  }

  return results;
}

export function loadBuiltinSkills(): SkillDefinition[] {
  const skillsRoot = path.join(process.cwd(), "remotechat", "skills");
  if (!fs.existsSync(skillsRoot)) return [];

  const skills: SkillDefinition[] = [];
  const categories = fs.readdirSync(skillsRoot);

  for (const category of categories) {
    const catDir = path.join(skillsRoot, category);
    if (!fs.statSync(catDir).isDirectory()) continue;

    for (const skillFolder of fs.readdirSync(catDir)) {
      const skillFile = path.join(catDir, skillFolder, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;

      const raw = fs.readFileSync(skillFile, "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const slug = String(meta.name ?? skillFolder);

      skills.push({
        id: `builtin-${category}-${slug}`,
        slug,
        name: slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        category: (meta.category as SkillDefinition["category"]) ?? "core",
        description: String(meta.description ?? ""),
        applicableAgents: (Array.isArray(meta.applicable_agents)
          ? meta.applicable_agents
          : ["architect", "developer"]) as AgentId[],
        triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
        tools: Array.isArray(meta.tools) ? meta.tools : [],
        contentMd: raw,
        isBuiltin: true,
        isActive: true,
        version: 1,
      });
      void body;
    }
  }

  return skills;
}

export function listAllSkills(): SkillDefinition[] {
  const builtin = loadBuiltinSkills();
  const custom = getAppState().customSkills;
  return [...builtin, ...custom];
}

export function createCustomSkill(input: {
  name: string;
  slug: string;
  category: SkillDefinition["category"];
  description: string;
  applicableAgents: AgentId[];
  contentMd: string;
}): SkillDefinition {
  const state = getAppState();
  const skill: SkillDefinition = {
    id: `custom-${input.slug}-${Date.now()}`,
    slug: input.slug,
    name: input.name,
    category: input.category,
    description: input.description,
    applicableAgents: input.applicableAgents,
    triggers: ["manual"],
    tools: [],
    contentMd: input.contentMd,
    isBuiltin: false,
    isActive: true,
    version: 1,
  };
  state.customSkills.push(skill);
  saveAppState(state);
  return skill;
}

export interface RepoSkillComparison {
  path: string;
  status: "new_in_repo" | "modified" | "in_sync";
  remoteContent: string;
  localContent?: string;
}

export function compareRepoInstructionFiles(
  repoFiles: Array<{ path: string; content: string }>
): RepoSkillComparison[] {
  const localSkills = listAllSkills();
  return repoFiles.map((rf) => {
    const matched = localSkills.find(
      (s) => rf.path.toLowerCase().includes(s.slug.toLowerCase())
    );
    if (!matched) {
      return {
        path: rf.path,
        status: "new_in_repo",
        remoteContent: rf.content,
      };
    }
    return {
      path: rf.path,
      status: matched.contentMd.trim() === rf.content.trim() ? "in_sync" : "modified",
      remoteContent: rf.content,
      localContent: matched.contentMd,
    };
  });
}
