const GITHUB_API = "https://api.github.com";

async function ghFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 240)}`);
  }

  return (await res.json()) as T;
}

export async function verifyGitHubToken(token: string) {
  return ghFetch<{ login: string; avatar_url: string; name: string | null }>(token, "/user");
}

export async function listRepositories(token: string) {
  return ghFetch<
    Array<{
      id: number;
      full_name: string;
      name: string;
      private: boolean;
      default_branch: string;
      html_url: string;
      language: string | null;
      updated_at: string;
    }>
  >(token, "/user/repos?sort=updated&per_page=50");
}

export async function listBranches(token: string, fullName: string) {
  return ghFetch<Array<{ name: string; protected: boolean; commit: { sha: string } }>>(
    token,
    `/repos/${fullName}/branches?per_page=50`
  );
}

export async function getRepoTree(token: string, fullName: string, branch = "main") {
  return ghFetch<{
    sha: string;
    tree: Array<{ path: string; type: "blob" | "tree"; size?: number; sha: string }>;
  }>(token, `/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
}

export async function getFileContent(token: string, fullName: string, filePath: string, ref = "main") {
  const data = await ghFetch<{
    name: string;
    path: string;
    sha: string;
    content: string;
    encoding: string;
  }>(token, `/repos/${fullName}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`);

  const decoded =
    data.encoding === "base64" ? Buffer.from(data.content, "base64").toString("utf8") : data.content;

  return {
    path: data.path,
    sha: data.sha,
    content: decoded,
  };
}

export async function createBranch(token: string, fullName: string, newBranch: string, fromBranch = "main") {
  const baseRef = await ghFetch<{ object: { sha: string } }>(
    token,
    `/repos/${fullName}/git/ref/heads/${encodeURIComponent(fromBranch)}`
  );
  return ghFetch<{ ref: string }>(token, `/repos/${fullName}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${newBranch}`,
      sha: baseRef.object.sha,
    }),
  });
}

export async function createOrUpdateFile(
  token: string,
  fullName: string,
  params: { path: string; content: string; message: string; branch: string; sha?: string }
) {
  return ghFetch<{ commit: { sha: string; html_url: string } }>(
    token,
    `/repos/${fullName}/contents/${encodeURIComponent(params.path)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: params.message,
        content: Buffer.from(params.content, "utf8").toString("base64"),
        branch: params.branch,
        ...(params.sha ? { sha: params.sha } : {}),
      }),
    }
  );
}

export async function createPullRequest(
  token: string,
  fullName: string,
  params: { title: string; body: string; head: string; base: string }
) {
  return ghFetch<{ number: number; html_url: string; state: string }>(
    token,
    `/repos/${fullName}/pulls`,
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
}

export async function listWorkflowRuns(token: string, fullName: string) {
  return ghFetch<{
    workflow_runs: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      head_branch: string;
      html_url: string;
      created_at: string;
    }>;
  }>(token, `/repos/${fullName}/actions/runs?per_page=20`);
}

export async function listCommits(token: string, fullName: string, branch = "main") {
  return ghFetch<
    Array<{
      sha: string;
      html_url: string;
      commit: {
        message: string;
        author: { name: string; date: string };
      };
    }>
  >(token, `/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&per_page=20`);
}

export async function listPullRequests(token: string, fullName: string) {
  return ghFetch<
    Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      created_at: string;
      user: { login: string };
      head: { ref: string };
      base: { ref: string };
    }>
  >(token, `/repos/${fullName}/pulls?state=all&per_page=20`);
}
