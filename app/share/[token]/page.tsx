import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/app/project-workspace";
import { loadProjectByShareToken } from "@/lib/server/services/project-service";

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await loadProjectByShareToken(token);
  if (!project) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[1700px] px-4 py-6">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
        Shared view. This link is read-only, so anyone can review the flow without editing your
        source project.
      </div>
      <ProjectWorkspace initialProject={project} readOnly />
    </main>
  );
}
