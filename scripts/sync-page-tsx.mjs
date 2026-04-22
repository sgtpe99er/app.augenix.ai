import { config } from 'dotenv';
import { readFileSync } from 'node:fs';

config({ path: '.env.local' });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = 'freewebsite-deal';

async function getFile(repo, path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`Failed to get ${path}: ${res.status}`);
  const data = await res.json();
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha };
}

async function upsertFile(repo, path, content, message, sha) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
      branch: 'main',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update ${path}: ${res.status} ${err}`);
  }
  return res.json();
}

const customerRepo = 'integrated-outdoor-designs-gkcn';

async function pushLocalFile(localPath, destPath, message) {
  const content = readFileSync(localPath, 'utf-8');
  console.log(`Local ${localPath} length:`, content.length);
  
  let customerSha;
  try {
    const customer = await getFile(customerRepo, destPath);
    customerSha = customer.sha;
    console.log(`Customer ${destPath} exists, sha:`, customerSha.substring(0, 7));
  } catch {
    console.log(`Customer ${destPath} does not exist, will create`);
  }
  
  await upsertFile(customerRepo, destPath, content, message, customerSha);
  console.log(`Pushed ${localPath} → ${destPath}`);
}

(async () => {
  // Push bare migration layout
  await pushLocalFile('migration-template/layout.tsx', 'src/app/layout.tsx', 'feat: bare migration layout');
  
  // Push API route that serves full HTML document
  await pushLocalFile('migration-template/api/migrated/route.ts', 'src/app/api/migrated/route.ts', 'feat: API route serving migrated HTML');
  
  // Push middleware that rewrites / to /api/migrated (runs before route matching)
  await pushLocalFile('migration-template/middleware.ts', 'src/middleware.ts', 'feat: middleware rewrite / to /api/migrated');
  
  // Push next.config.js
  await pushLocalFile('migration-template/next.config.js', 'next.config.js', 'feat: migration next.config.js');
  
  console.log('All files pushed successfully');
})();
