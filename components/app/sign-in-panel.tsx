"use client";

import { startTransition, useState } from "react";
import { signIn } from "next-auth/react";

interface ProviderOption {
  id: string;
  name: string;
}

export function SignInPanel({ providers }: { providers: ProviderOption[] }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const socialProviders = providers.filter((provider) => provider.id !== "credentials");

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-blue-950/20 backdrop-blur">
      <div className="mb-8 space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">Open source workflow</p>
        <h1 className="text-3xl font-semibold text-white">Sign in to FlowLens</h1>
        <p className="text-sm leading-6 text-white/60">
          Use a provider, or start with a local email session so you can test the full product
          without extra setup.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            void signIn("credentials", {
              email,
              name,
              callbackUrl: "/app",
            });
          });
        }}
      >
        <div className="space-y-2">
          <label className="text-sm text-white/80" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-white/8"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/80" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-white/8"
            placeholder="Designer or reviewer"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Continue with local email
        </button>
      </form>

      {socialProviders.length > 0 ? (
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Providers</p>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          {socialProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => {
                startTransition(() => {
                  void signIn(provider.id, { callbackUrl: "/app" });
                });
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Continue with {provider.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
