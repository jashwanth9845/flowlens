"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!email || !password) { setError("Email and password required"); return; }
    if (mode === "signup" && !name) { setError("Name is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setSuccess("Account created! Check your email to confirm, then sign in.");
      setMode("signin");
      setLoading(false);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0c0c0d]">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">F</div>
          <span className="text-lg font-semibold text-zinc-100">FlowLens</span>
        </div>

        <h1 className="text-xl font-semibold text-zinc-100 text-center mb-1">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-sm text-zinc-500 text-center mb-6">
          {mode === "signin" ? "Welcome back" : "Start building visual flows"}
        </p>

        <div className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Name</label>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Email</label>
            <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Password</label>
            <input type="password" placeholder={mode === "signup" ? "Min 6 characters" : "••••••••"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium text-sm rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>

          {error && <div className="px-3.5 py-2.5 bg-red-950/40 border border-red-900/40 rounded-lg text-sm text-red-400">{error}</div>}
          {success && <div className="px-3.5 py-2.5 bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-sm text-emerald-400">{success}</div>}
        </div>

        <div className="mt-6 text-center">
          {mode === "signin" ? (
            <p className="text-sm text-zinc-500">
              No account?{" "}
              <button onClick={() => { setMode("signup"); setError(null); setSuccess(null); }} className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">Create one</button>
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Already have an account?{" "}
              <button onClick={() => { setMode("signin"); setError(null); setSuccess(null); }} className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
