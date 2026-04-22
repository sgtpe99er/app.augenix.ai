import { requireAdmin } from '../require-admin';
import { EditsTab } from '../tabs/edits-tab';

export default async function AdminEditsPage() {
  await requireAdmin();
  return <EditsTab />;
}
