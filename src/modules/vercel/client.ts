const VERCEL_API = "https://api.vercel.com";

async function vercelFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel API ${res.status}: ${text.slice(0, 240)}`);
  }

  return (await res.json()) as T;
}

export async function verifyVercelToken(token: string) {
  return vercelFetch<{ user: { username: string; email: string; name?: string } }>(token, "/v2/user");
}

export async function listVercelProjects(token: string) {
  return vercelFetch<{
    projects: Array<{
      id: string;
      name: string;
      framework: string | null;
      link?: { type?: string; repo?: string };
      targets?: { production?: { url?: string; alias?: string[] } };
      latestDeployments?: Array<{ url?: string; readyState?: string; alias?: string[] }>;
    }>;
  }>(token, "/v9/projects?limit=50");
}

export async function listDeployments(token: string, projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}&limit=20` : "?limit=20";
  return vercelFetch<{
    deployments: Array<{
      uid: string;
      name: string;
      url: string;
      state: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
      target?: string | null;
      createdAt: number;
      meta?: Record<string, string>;
    }>;
  }>(token, `/v6/deployments${qs}`);
}

export async function getDeploymentEvents(token: string, deploymentId: string) {
  return vercelFetch<
    Array<{
      type: string;
      created: number;
      payload?: { text?: string };
    }>
  >(token, `/v3/deployments/${encodeURIComponent(deploymentId)}/events?limit=100`);
}
