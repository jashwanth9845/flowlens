import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { getProjectHistory, loadProjectForEditor } from "@/lib/server/services/project-service";
import { ProjectWorkspace } from "@/components/app/project-workspace";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) {
    notFound();
  }

  const { id } = await params;
  const [project, history] = await Promise.all([
    loadProjectForEditor(user.id, id),
    getProjectHistory(user.id, id),
  ]);

  if (!project) {
    notFound();
  }

  return <ProjectWorkspace initialProject={project} importHistory={history} />;
}
