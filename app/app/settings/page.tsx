import Link from "next/link";
import { Lock, PenTool, Share2 } from "lucide-react";

const cards = [
  {
    href: "/app/settings/integrations/figma",
    title: "Figma connection",
    body: "Configure OAuth or a personal token, see sync status, and keep imports reliable.",
    icon: PenTool,
  },
  {
    href: "/app/projects",
    title: "Project sharing",
    body: "Create read-only share links from any project and keep the edit surface owner-only.",
    icon: Share2,
  },
  {
    href: "/sign-in",
    title: "Authentication",
    body: "FlowLens is wired for provider auth and local email fallback so contributors can test quickly.",
    icon: Lock,
  },
];

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Settings</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Project infrastructure</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
          Keep integrations, sharing, and authentication clear so the product stays easier than the
          source design file.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-100">
              <card.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-7 text-white/55">{card.body}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
