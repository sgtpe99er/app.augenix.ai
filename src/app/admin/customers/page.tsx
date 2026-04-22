import { requireAdmin } from '../require-admin';
import { UsersTab } from '../tabs/users-tab';

export default async function AdminCustomersPage() {
  await requireAdmin();
  return <UsersTab />;
}
