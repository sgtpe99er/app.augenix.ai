import { requireAdmin } from '../require-admin';

import { AdminQueueDashboard } from './admin-queue-dashboard';

export default async function AdminQueuePage() {
  await requireAdmin();
  return <AdminQueueDashboard />;
}
