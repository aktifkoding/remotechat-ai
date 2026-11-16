const SUPABASE_MGMT_API = "https://api.supabase.com/v1";

async function sbMgmtFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_MGMT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Management API ${res.status}: ${text.slice(0, 240)}`);
  }

  return (await res.json()) as T;
}

export async function listSupabaseProjects(token: string) {
  return sbMgmtFetch<
    Array<{
      id: string;
      organization_id: string;
      name: string;
      region: string;
      status: string;
      database?: { host?: string };
    }>
  >(token, "/projects");
}

export async function inspectSupabaseTables(token: string, projectRef: string) {
  return sbMgmtFetch<unknown>(
    token,
    `/projects/${encodeURIComponent(projectRef)}/database/query`,
    {
      method: "POST",
      body: JSON.stringify({
        query:
          "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
      }),
    }
  );
}

/**
 * Approval-gated SQL execution: should ONLY be called after user approval.
 */
export async function executeApprovedSql(token: string, projectRef: string, sql: string) {
  return sbMgmtFetch<unknown>(
    token,
    `/projects/${encodeURIComponent(projectRef)}/database/query`,
    {
      method: "POST",
      body: JSON.stringify({ query: sql }),
    }
  );
}
