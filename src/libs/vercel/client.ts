const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const GITHUB_ORG = process.env.GITHUB_ORG ?? 'freewebsite-deal';

const BASE = 'https://api.vercel.com';

function vercelHeaders(): HeadersInit {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN env var is not set');
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function teamQuery(): string {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
}

function teamParam(prefix = '?'): string {
  return VERCEL_TEAM_ID ? `${prefix}teamId=${VERCEL_TEAM_ID}` : '';
}

async function vercelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...vercelHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API error ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface VercelProject {
  id: string;
  name: string;
  link?: {
    type: string;
    repo: string;
    org: string;
  };
}

export interface VercelDeployment {
  uid: string;
  url: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readyState: string;
  createdAt: number;
  meta?: Record<string, string>;
}

export interface VercelDomainConfig {
  name: string;
  apexName: string;
  verified: boolean;
}

/**
 * Create a Vercel project linked to a GitHub repo.
 * The repo must already exist in the GitHub org.
 */
export async function createProject(
  projectName: string,
  githubRepoName: string,
): Promise<VercelProject> {
  return vercelFetch<VercelProject>(`/v10/projects${teamQuery()}`, {
    method: 'POST',
    body: JSON.stringify({
      name: projectName,
      framework: 'nextjs',
      gitRepository: {
        type: 'github',
        repo: `${GITHUB_ORG}/${githubRepoName}`,
      },
      installCommand: 'npm install',
      buildCommand: 'npm run build',
      outputDirectory: '.next',
      publicSource: false,
    }),
  });
}

/**
 * Add a domain (or subdomain) to a Vercel project.
 */
export async function addDomain(
  projectId: string,
  domain: string,
): Promise<VercelDomainConfig> {
  return vercelFetch<VercelDomainConfig>(
    `/v10/projects/${projectId}/domains${teamQuery()}`,
    {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    },
  );
}

/**
 * Remove a domain from a Vercel project.
 */
export async function removeDomain(
  projectId: string,
  domain: string,
): Promise<void> {
  const sep = VERCEL_TEAM_ID ? '&' : '?';
  await vercelFetch(
    `/v10/projects/${projectId}/domains/${domain}${teamParam()}`,
    { method: 'DELETE' },
  );
}

/**
 * Get the latest deployment for a project.
 */
export async function getLatestDeployment(
  projectId: string,
): Promise<VercelDeployment | null> {
  const sep = VERCEL_TEAM_ID ? '&' : '?';
  const data = await vercelFetch<{ deployments: VercelDeployment[] }>(
    `/v6/deployments${teamParam()}${VERCEL_TEAM_ID ? '&' : '?'}projectId=${projectId}&limit=1&sort=createdAt&order=desc`,
  );
  return data.deployments?.[0] ?? null;
}

/**
 * Get a preview deployment URL for a specific branch.
 */
export async function getBranchDeployment(
  projectId: string,
  branch: string,
): Promise<VercelDeployment | null> {
  const data = await vercelFetch<{ deployments: VercelDeployment[] }>(
    `/v6/deployments${teamParam()}${VERCEL_TEAM_ID ? '&' : '?'}projectId=${projectId}&meta-gitBranch=${encodeURIComponent(branch)}&limit=1&sort=createdAt&order=desc`,
  );
  return data.deployments?.[0] ?? null;
}

/**
 * Get a Vercel project by ID.
 */
export async function getProject(projectId: string): Promise<VercelProject> {
  return vercelFetch<VercelProject>(`/v9/projects/${projectId}${teamParam()}`);
}

/**
 * Delete a Vercel project.
 */
export async function deleteProject(projectId: string): Promise<void> {
  await vercelFetch(`/v9/projects/${projectId}${teamParam()}`, {
    method: 'DELETE',
  });
}

/**
 * Get all environment variables for a Vercel project, returned as a key→value map.
 * Only works for plain (non-encrypted) vars — encrypted values come back as empty string.
 */
export async function getEnvVars(
  projectId: string,
): Promise<Record<string, string>> {
  const data = await vercelFetch<{ envs: { key: string; value: string; type: string }[] }>(
    `/v9/projects/${projectId}/env${teamQuery()}`,
  );
  return Object.fromEntries((data.envs ?? []).map((e) => [e.key, e.value ?? '']));
}

/**
 * Add an environment variable to a Vercel project.
 */
export async function addEnvVar(
  projectId: string,
  key: string,
  value: string,
  targets: ('production' | 'preview' | 'development')[] = ['production', 'preview'],
): Promise<void> {
  await vercelFetch(`/v10/projects/${projectId}/env${teamQuery()}`, {
    method: 'POST',
    body: JSON.stringify({ key, value, type: 'plain', target: targets }),
  });
}

/**
 * Upsert an environment variable: update it if it exists, create it if not.
 */
export async function upsertEnvVar(
  projectId: string,
  key: string,
  value: string,
  targets: ('production' | 'preview' | 'development')[] = ['production', 'preview'],
): Promise<void> {
  // List existing env vars to check if key already exists
  const data = await vercelFetch<{ envs: { id: string; key: string }[] }>(
    `/v9/projects/${projectId}/env${teamQuery()}`,
  );
  const existing = (data.envs ?? []).find((e) => e.key === key);

  if (existing) {
    await vercelFetch(`/v9/projects/${projectId}/env/${existing.id}${teamParam()}`, {
      method: 'PATCH',
      body: JSON.stringify({ value, type: 'plain', target: targets }),
    });
  } else {
    await addEnvVar(projectId, key, value, targets);
  }
}
