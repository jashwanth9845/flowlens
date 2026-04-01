"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
  if (s <= 2) return { score: 2, label: "Fair", color: "#f59e0b" };
  if (s <= 3) return { score: 3, label: "Good", color: "#3b82f6" };
  return { score: 4, label: "Strong", color: "#10b981" };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const strength = useMemo(() => getStrength(password), [password]);

  const handleSubmit = async () => {
    setError(null); setSuccess(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "signup" && !name.trim()) { setError("Please enter your name."); return; }
    if (mode === "signup" && password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name.trim() } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setSuccess("Account created! You can now sign in.");
      setMode("signin"); setPassword(""); setLoading(false);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0c0c0d]">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[440px] flex-col justify-between p-10 border-r border-zinc-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">F</div>
            <span className="text-base font-semibold text-zinc-100">FlowLens</span>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100 leading-snug mb-3">
            See your app&apos;s flow,<br />not just its screens.
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
            Import from Figma or upload screenshots. Detect interactive elements, connect screens, and visualize the entire user journey — no prototyping skills needed.
          </p>
        </div>
        <div className="space-y-2.5 text-[13px] text-zinc-600">
          <p className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Works with and without Figma</p>
          <p className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Auto-detects buttons, inputs, links</p>
          <p className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Screenshots pulled automatically</p>
          <p className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Free and open source forever</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">F</div>
            <span className="text-[15px] font-semibold text-zinc-100">FlowLens</span>
          </div>

          <h1 className="text-xl font-semibold text-zinc-100 mb-0.5">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            {mode === "signin" ? "Sign in to continue to your projects." : "Get started for free — no credit card."}
          </p>

          <div className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Full name</label>
                <input type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "signup" ? "Min 6 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  className="w-full px-3.5 py-2.5 pr-10 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer transition" tabIndex={-1} aria-label="Toggle password">
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength meter — only on signup */}
              {mode === "signup" && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i <= strength.score ? strength.color : "#27272a" }} />
                    ))}
                  </div>
                  <p className="text-[11px] transition-colors" style={{ color: strength.color }}>
                    {strength.label}
                    {strength.score < 3 && <span className="text-zinc-600"> — try adding numbers or symbols</span>}
                  </p>
                </div>
              )}
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-2.5 mt-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium text-sm rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>

            {error && <div className="px-3.5 py-2.5 bg-red-950/40 border border-red-900/40 rounded-lg text-sm text-red-400">{error}</div>}
            {success && <div className="px-3.5 py-2.5 bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-sm text-emerald-400">{success}</div>}
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setSuccess(null); setPassword(""); }}
              className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
