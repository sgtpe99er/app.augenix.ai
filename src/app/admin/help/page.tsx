import { readFileSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '../require-admin';
import { HelpTab } from '../tabs/help-tab';

export default async function AdminHelpPage() {
  await requireAdmin();

  const adminGuideContent = readFileSync(join(process.cwd(), 'ADMIN_GUIDE.md'), 'utf-8');

  return <HelpTab content={adminGuideContent} />;
}
