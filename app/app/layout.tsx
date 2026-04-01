import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, Home, PenTool, Settings } from "lucide-react";
import { requireUser } from "@/lib/server/auth";
import { LogoutButton } from "@/components/app/logout-button";

const navItems = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/projects", label: "Projects", icon: FolderOpen },
  { href: "/app/settings/integrations/figma", label: "Figma", icon: PenTool },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08111f]/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Link href="/app" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-bold text-slate-950">
                  F
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">FlowLens</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
                    Workspace
                  </p>
                </div>
              </Link>
              <nav className="hidden items-center gap-2 lg:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/45">{user.email}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
