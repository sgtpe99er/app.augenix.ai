const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG ?? 'freewebsite-deal';
const TEMPLATE_REPO = process.env.GITHUB_TEMPLATE_REPO ?? 'template';

const BASE = 'https://api.github.com';

function githubHeaders(): HeadersInit {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN env var is not set');
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function githubFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...githubHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

export interface GitHubPullRequest {
  number: number;
  html_url: string;
  state: string;
  title: string;
  head: { ref: string };
  base: { ref: string };
}

/**
 * Create a private repo for a customer by cloning the template repo.
 * Returns the newly created repo.
 */
export async function createRepoFromTemplate(
  repoName: string,
): Promise<GitHubRepo> {
  return githubFetch<GitHubRepo>(
    `/repos/${GITHUB_ORG}/${TEMPLATE_REPO}/generate`,
    {
      method: 'POST',
      body: JSON.stringify({
        owner: GITHUB_ORG,
        name: repoName,
        private: true,
        include_all_branches: false,
        description: `Customer site: ${repoName}`,
      }),
    },
  );
}

/**
 * Get a single file's content (decoded) from a repo.
 */
export async function getRepoFile(
  repoName: string,
  filePath: string,
  branch = 'main',
): Promise<{ content: string; sha: string }> {
  const data = await githubFetch<{ content: string; sha: string }>(
    `/repos/${GITHUB_ORG}/${repoName}/contents/${filePath}?ref=${branch}`,
  );
  return {
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha,
  };
}

/**
 * Create or update a single file in a repo on a given branch.
 */
export async function upsertRepoFile(
  repoName: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch = 'main',
  existingSha?: string,
): Promise<void> {
  await githubFetch(
    `/repos/${GITHUB_ORG}/${repoName}/contents/${filePath}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    },
  );
}

/**
 * Create a new branch off of `base` (default: main).
 */
export async function createBranch(
  repoName: string,
  branchName: string,
  base = 'main',
): Promise<void> {
  const refData = await githubFetch<{ object: { sha: string } }>(
    `/repos/${GITHUB_ORG}/${repoName}/git/ref/heads/${base}`,
  );
  await githubFetch(`/repos/${GITHUB_ORG}/${repoName}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha,
    }),
  });
}

/**
 * Open a pull request from `branch` into `base` (default: main).
 */
export async function createPullRequest(
  repoName: string,
  branch: string,
  title: string,
  body = '',
  base = 'main',
): Promise<GitHubPullRequest> {
  return githubFetch<GitHubPullRequest>(
    `/repos/${GITHUB_ORG}/${repoName}/pulls`,
    {
      method: 'POST',
      body: JSON.stringify({ title, body, head: branch, base }),
    },
  );
}

/**
 * Merge a pull request (squash merge).
 */
export async function mergePullRequest(
  repoName: string,
  prNumber: number,
  commitTitle?: string,
): Promise<void> {
  await githubFetch(
    `/repos/${GITHUB_ORG}/${repoName}/pulls/${prNumber}/merge`,
    {
      method: 'PUT',
      body: JSON.stringify({
        merge_method: 'squash',
        commit_title: commitTitle ?? `Merge PR #${prNumber}`,
      }),
    },
  );
}

/**
 * List open pull requests for a repo.
 */
export async function listOpenPullRequests(
  repoName: string,
): Promise<GitHubPullRequest[]> {
  return githubFetch<GitHubPullRequest[]>(
    `/repos/${GITHUB_ORG}/${repoName}/pulls?state=open&per_page=20`,
  );
}

/**
 * Delete a repo (use with caution — irreversible).
 */
export async function deleteRepo(repoName: string): Promise<void> {
  await githubFetch(`/repos/${GITHUB_ORG}/${repoName}`, { method: 'DELETE' });
}

/**
 * Push multiple files to a branch in a single commit using the Git Data API.
 */
export async function commitMultipleFiles(
  repoName: string,
  files: { path: string; content: string }[],
  commitMessage: string,
  branch = 'main',
): Promise<void> {
  // 1. Get the current HEAD commit SHA for the branch
  const refData = await githubFetch<{ object: { sha: string } }>(
    `/repos/${GITHUB_ORG}/${repoName}/git/ref/heads/${branch}`,
  );
  const headSha = refData.object.sha;

  // 2. Get the tree SHA from the commit
  const commitData = await githubFetch<{ tree: { sha: string } }>(
    `/repos/${GITHUB_ORG}/${repoName}/git/commits/${headSha}`,
  );
  const basTreeSha = commitData.tree.sha;

  // 3. Create a new tree with all files
  const tree = files.map((f) => ({
    path: f.path,
    mode: '100644' as const,
    type: 'blob' as const,
    content: f.content,
  }));

  const newTree = await githubFetch<{ sha: string }>(
    `/repos/${GITHUB_ORG}/${repoName}/git/trees`,
    {
      method: 'POST',
      body: JSON.stringify({ base_tree: basTreeSha, tree }),
    },
  );

  // 4. Create a new commit
  const newCommit = await githubFetch<{ sha: string }>(
    `/repos/${GITHUB_ORG}/${repoName}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: newTree.sha,
        parents: [headSha],
      }),
    },
  );

  // 5. Update the branch ref to point to the new commit
  await githubFetch(`/repos/${GITHUB_ORG}/${repoName}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  });
}
