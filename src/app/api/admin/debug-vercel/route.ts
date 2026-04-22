import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/libs/vercel/client';
import { getRepoFile } from '@/libs/github/client';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function getEnvVars(projectId: string) {
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env${teamParam}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.envs ?? [];
}

async function checkRepoPageTsx(repoName: string) {
  try {
    const file = await getRepoFile(repoName, 'src/app/page.tsx');
    const hasMigrationSupport = file.content.includes('getMigratedHomepage');
    return { 
      exists: true, 
      hasMigrationSupport,
      firstLines: file.content.split('\n').slice(0, 20).join('\n'),
    };
  } catch (err: any) {
    return { exists: false, error: err.message };
  }
}

export async function GET(req: NextRequest) {
  const projectName = req.nextUrl.searchParams.get('project') || 'integrated-outdoor-designs-gkcn';
  
  try {
    const project = await getProject(projectName);
    const envVars = await getEnvVars(project.id);
    
    // Filter to show only migration-related env vars (hide sensitive values)
    const migrationEnvs = envVars
      .filter((e: any) => ['MIGRATION_JOB_ID', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'].includes(e.key))
      .map((e: any) => ({
        key: e.key,
        value: e.key === 'MIGRATION_JOB_ID' ? e.value : '[hidden]',
        target: e.target,
      }));

    // Check if customer repo has migration-aware page.tsx
    const repoName = project.link?.repo ?? projectName;
    const pageTsxCheck = await checkRepoPageTsx(repoName);

    return NextResponse.json({
      id: project.id,
      name: project.name,
      linkedRepo: project.link ? `${project.link.org}/${project.link.repo}` : 'not linked',
      envVars: migrationEnvs,
      pageTsx: pageTsxCheck,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
