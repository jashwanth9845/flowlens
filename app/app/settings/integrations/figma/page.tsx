import Link from "next/link";
import { KeyRound, PenTool, RefreshCcw } from "lucide-react";
import { hasFigmaOAuth } from "@/lib/server/env";
import { requireUser } from "@/lib/server/auth";
import { getFigmaConnection } from "@/lib/server/store";
import { disconnectFigmaAction, saveFigmaPatAction } from "@/app/app/actions";
import { formatDateTime } from "@/lib/utils";

export default async function FigmaIntegrationPage() {
  const user = await requireUser();
  if (!user) {
    return null;
  }

  const connection = await getFigmaConnection(user.id);
  const oauthEnabled = hasFigmaOAuth();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Figma integration</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Connect once, import whenever you want</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
          OAuth is the production path. Personal tokens stay available so self-hosters and local
          contributors can still use FlowLens without waiting on app registration.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-3">
            <PenTool className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-semibold text-white">OAuth connection</h2>
          </div>
          <p className="text-sm leading-7 text-white/55">
            Use Figma OAuth for long-lived production connections. The callback and refresh flow are
            wired in; you only need the Figma OAuth env vars for it to go live.
          </p>
          <div className="mt-5">
            {oauthEnabled ? (
              <Link
                href="/api/figma/oauth/start"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <RefreshCcw className="h-4 w-4" />
                Connect with Figma OAuth
              </Link>
            ) : (
              <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Add `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`, and `FIGMA_OAUTH_REDIRECT_URI` to enable OAuth.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-semibold text-white">Personal access token</h2>
          </div>
          <p className="text-sm leading-7 text-white/55">
            Store a PAT securely on the server so FlowLens can import files even without OAuth app setup.
          </p>
          <form action={saveFigmaPatAction} className="mt-5 space-y-4">
            <input
              name="token"
              type="password"
              placeholder="figd_..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
            />
            <button
              type="submit"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              Save token
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">Current status</h2>
        {connection ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">
              Connected via {connection.mode.toUpperCase()} • last sync {formatDateTime(connection.lastSyncAt)}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Display</p>
                <p className="mt-2 text-sm text-white/75">{connection.displayName}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Scopes</p>
                <p className="mt-2 text-sm text-white/75">{connection.scopes.join(", ")}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Updated</p>
                <p className="mt-2 text-sm text-white/75">{formatDateTime(connection.updatedAt)}</p>
              </div>
            </div>
            <form action={disconnectFigmaAction}>
              <button
                type="submit"
                className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
              >
                Disconnect Figma
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/50">
            No Figma connection yet. Add OAuth or a PAT, then go back to
            {" "}
            <Link href="/app/projects" className="underline underline-offset-4">
              Projects
            </Link>
            {" "}
            to import a file.
          </div>
        )}
      </section>
    </main>
  );
}
