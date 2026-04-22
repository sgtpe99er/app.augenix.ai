import { requireAdmin } from '../require-admin';
import { ProjectsTab } from '../tabs/projects-tab';

export default async function AdminSitesPage() {
  await requireAdmin();
  return <ProjectsTab />;
}
