import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CUSTOMER_REPO = 'integrated-outdoor-designs-gkcn';
const OWNER = 'freewebsite-deal';

async function getFile(path) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${CUSTOMER_REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function upsertFile(path, content, message) {
  const existing = await getFile(path);
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: 'main',
  };
  if (existing?.sha) {
    body.sha = existing.sha;
  }
  
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${CUSTOMER_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upsert ${path}: ${err}`);
  }
  console.log(`✓ Updated ${path}`);
}

async function main() {
  // Read migration template files
  const middlewareContent = readFileSync('migration-template/middleware.ts', 'utf-8');
  const apiRouteContent = readFileSync('migration-template/api/migrated/route.ts', 'utf-8');
  
  // Push to customer repo
  await upsertFile('src/middleware.ts', middlewareContent, 'feat: support all migrated pages');
  await upsertFile('src/app/api/migrated/route.ts', apiRouteContent, 'feat: support all migrated pages');
  
  console.log('\nDone! Vercel should auto-deploy in 1-2 minutes.');
}

main().catch(console.error);
