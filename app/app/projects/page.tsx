import Link from "next/link";
import { ArrowRight, FolderPlus, Layers3, PenTool, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/server/auth";
import { getFigmaConnection } from "@/lib/server/store";
import { listUserProjects } from "@/lib/server/services/project-service";
import { createManualProjectAction, importFigmaProjectAction } from "../actions";
import { formatDateTime } from "@/lib/utils";

export default async function ProjectsPage() {
  const user = await requireUser();
  if (!user) {
    return null;
  }

  const [projects, figmaConnection] = await Promise.all([
    listUserProjects(user.id),
    getFigmaConnection(user.id),
  ]);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Projects</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">Flow library</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
              Start with Figma when you have it, or create a manual project when you want freedom.
              Every project becomes a searchable, shareable flow workspace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}`}
                className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
                      {project.sourceMode}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{project.name}</h2>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/45" />
                </div>
                <p className="mt-3 text-sm leading-7 text-white/55">{project.description}</p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs text-white/40">
                  <span>{project.screenCount} screens</span>
                  <span>{project.connectionCount} flows</span>
                  <span>{project.categoryCount} categories</span>
                  <span>Updated {formatDateTime(project.updatedAt)}</span>
                </div>
              </Link>
            ))}

            {projects.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm leading-7 text-white/50 md:col-span-2">
                No projects yet. Create one below and FlowLens will remember where you left off.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center gap-3">
              <FolderPlus className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-semibold text-white">Create a manual project</h2>
            </div>
            <form action={createManualProjectAction} className="space-y-4">
              <input
                name="name"
                type="text"
                required
                placeholder="Project name"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
              <textarea
                name="description"
                rows={4}
                placeholder="What kind of flow are you mapping?"
                className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                <Layers3 className="h-4 w-4" />
                Create project
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center gap-3">
              <PenTool className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-semibold text-white">Import from Figma</h2>
            </div>
            <p className="mb-4 text-sm leading-7 text-white/55">
              FlowLens will pull screenshots from the file, detect named actions, and group screens by
              page and section.
            </p>
            {figmaConnection ? (
              <div className="mb-4 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Connected with {figmaConnection.displayName}
              </div>
            ) : (
              <div className="mb-4 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Connect Figma first in Settings to import files.
              </div>
            )}
            <form action={importFigmaProjectAction} className="space-y-4">
              <input
                name="projectName"
                type="text"
                placeholder="Optional project name"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
              <input
                name="fileUrl"
                type="url"
                required
                placeholder="https://www.figma.com/design/..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!figmaConnection}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                >
                  <Sparkles className="h-4 w-4" />
                  Import file
                </button>
                <Link
                  href="/app/settings/integrations/figma"
                  className="text-sm text-cyan-200 underline underline-offset-4"
                >
                  Open Figma settings
                </Link>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
