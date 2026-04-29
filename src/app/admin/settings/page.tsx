import { requireAdmin } from '../require-admin';

import { AdminSettings } from './admin-settings';

export default async function AdminSettingsPage() {
  await requireAdmin();
  return <AdminSettings />;
}
