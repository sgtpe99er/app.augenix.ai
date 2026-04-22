import { requireAdmin } from '../require-admin';
import { CrmTab } from '../tabs/crm-tab';

export default async function AdminPipelinePage() {
  await requireAdmin();
  return <CrmTab />;
}
