import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { getResumeProject } from "@/lib/server/services/project-service";

export default async function AppIndexPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  const project = await getResumeProject(user.id);
  if (project) {
    redirect(`/app/projects/${project.id}`);
  }

  redirect("/app/projects");
}
