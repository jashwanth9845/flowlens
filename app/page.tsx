import Link from "next/link";
import { ArrowRight, FolderHeart, LayoutPanelTop, Search, Share2 } from "lucide-react";
import { auth } from "@/lib/server/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="relative overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-bold text-slate-950">
              F
            </div>
            <div>
              <p className="text-sm font-semibold text-white">FlowLens</p>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
                Open source prototype review
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href={session?.user ? "/app" : "/sign-in"}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              {session?.user ? "Open app" : "Start free"}
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100">
              Flow review should feel lighter than Figma
            </div>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
                A true app for designers to import, organize, search, and share flows.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/65">
                Connect Figma in Settings, pull screenshots directly from the file, auto-group screens
                by page and section, then refine hotspots, tags, and flows in a workspace made for
                collaboration. No lock-in: manual screenshots work too.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={session?.user ? "/app/projects" : "/sign-in"}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                {session?.user ? "Go to projects" : "Start building"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Open source setup
              </a>
            </div>
          </section>

          <section className="grid gap-4">
            {[
              {
                icon: LayoutPanelTop,
                title: "Cards-first workspace",
                body: "Review screens by category, start screen, changed state, dead ends, or manual-only additions.",
              },
              {
                icon: Search,
                title: "Real screenshot library",
                body: "Cache screenshots from Figma so projects stay resumable and useful long after the first import.",
              },
              {
                icon: Share2,
                title: "Share without forcing Figma",
                body: "Read-only share links and manual screenshot mode make reviews work for anyone, even outside the design file.",
              },
              {
                icon: FolderHeart,
                title: "Built to help people",
                body: "Production foundations with local fallbacks so open-source contributors can run it quickly and extend it with confidence.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-slate-950/20 backdrop-blur"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-100">
                  <item.icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/60">{item.body}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
