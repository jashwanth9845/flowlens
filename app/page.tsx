"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "@/lib/store";
import { ELEMENT_COLORS, SCREEN_FILTERS, type Hotspot, type Screen, type ConnectionAction, type TransitionType, type ScreenFilter } from "@/lib/types";
import { generateMarkdown } from "@/lib/export";
import HotspotOverlay from "@/components/editor/HotspotOverlay";

export default function Home() {
  const project = useStore((s) => s.project);
  const playerActive = useStore((s) => s.playerActive);
  useEffect(() => { const t = typeof window !== "undefined" && localStorage.getItem("fl_token"); if (t) useStore.getState().setToken(t); }, []);
  if (!project) return <ConnectView />;
  if (playerActive) return <PlayerView />;
  return <Dashboard />;
}

/* ================================================================
   CONNECT VIEW
   ================================================================ */
function ConnectView() {
  const { figmaToken, loading, error, setToken, loadFile } = useStore();
  const [url, setUrl] = useState("");
  const save = (t: string) => { setToken(t); if (typeof window !== "undefined") localStorage.setItem("fl_token", t); };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">F</div>
          <span className="text-[15px] font-semibold text-zinc-100">FlowLens</span>
        </div>

        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Connect your Figma file</h1>
        <p className="text-sm text-zinc-500 mb-8">Screens, actions and screenshots are pulled automatically.</p>

        <div className="space-y-3">
          <Field label="Personal access token" type="password" placeholder="figd_..." value={figmaToken} onChange={(v) => save(v)} hint="Figma → Settings → Security → Personal access tokens" />
          <Field label="File URL" placeholder="https://figma.com/design/..." value={url} onChange={setUrl} />

          <button onClick={() => loadFile(url)} disabled={loading || !figmaToken || !url}
            className="w-full py-2.5 mt-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {loading ? "Analyzing..." : "Connect"}
          </button>

          {error && <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-500 mb-3 font-medium">Naming convention</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
            {[["action-button-deposit","button"],["action-link-settings","link"],["action-nav-home","nav"],["action-icon-back","icon"],["action-input-search","input"]].map(([n,t])=>(
              <div key={n} className="contents"><span className="text-zinc-400">{n}</span><span className="text-zinc-600">→ {t}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, onChange: onC, ...rest }: { label: string; hint?: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input {...rest} onChange={(e) => onC(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
      {hint && <p className="text-[11px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

/* ================================================================
   DASHBOARD
   ================================================================ */
function Dashboard() {
  const project = useStore((s) => s.project!);
  const loadingImages = useStore((s) => s.loadingImages);
  const search = useStore((s) => s.search);
  const filter = useStore((s) => s.filter);
  const selectedId = useStore((s) => s.selectedScreenId);
  const connecting = useStore((s) => s.connectingHotspotId);
  const { setSearch, setFilter, selectScreen, disconnect, startPlayer } = useStore();

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    project.screens.forEach((s) => m.set(s.category, (m.get(s.category) || 0) + 1));
    return Array.from(m.entries());
  }, [project.screens]);

  const [catFilter, setCatFilter] = useState<string | null>(null);

  const screens = useMemo(() => {
    let list = project.screens;
    if (catFilter) list = list.filter((s) => s.category === catFilter);
    if (filter === "start") list = list.filter((s) => s.isStartScreen);
    else if (filter === "dead-end") list = list.filter((s) => !project.connections.some((c) => c.sourceScreenId === s.id));
    else if (filter === "unlinked") list = list.filter((s) => !project.connections.some((c) => c.sourceScreenId === s.id || c.targetScreenId === s.id));
    else if (filter === "no-hotspots") list = list.filter((s) => s.hotspots.length === 0);
    else if (filter === "has-image") list = list.filter((s) => !!s.imageUrl);
    if (search) { const q = search.toLowerCase(); list = list.filter((s) => s.name.toLowerCase().includes(q) || s.hotspots.some((h) => h.label.toLowerCase().includes(q))); }
    return list;
  }, [project, catFilter, filter, search]);

  const selected = project.screens.find((s) => s.id === selectedId);
  const total = project.screens.reduce((n, s) => n + s.hotspots.length, 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="h-12 border-b border-zinc-800/60 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">F</div>
          <span className="text-sm font-medium text-zinc-200">{project.name}</span>
          <span className="text-xs text-zinc-600 ml-1">{project.screens.length} screens · {total} actions · {project.connections.length} flows</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Btn onClick={startPlayer} accent>▶ Play</Btn>
          <Btn onClick={() => { navigator.clipboard.writeText(generateMarkdown(project)); }}>Export</Btn>
          <Btn onClick={disconnect} danger>Disconnect</Btn>
        </div>
      </header>

      {loadingImages && (
        <div className="h-8 bg-indigo-950/30 border-b border-indigo-900/20 px-4 flex items-center gap-2 text-xs text-indigo-400">
          <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          Rendering screenshots from Figma...
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-52 border-r border-zinc-800/60 flex flex-col shrink-0">
          <div className="p-3">
            <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-md text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 transition" />
          </div>

          {/* Filters */}
          <div className="px-3 pb-2">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">Filter</p>
            <div className="flex flex-wrap gap-1">
              {SCREEN_FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f === filter ? "all" : f)}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition ${filter === f ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-zinc-500 hover:text-zinc-300 border border-transparent"}`}>
                  {f.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mb-1 mt-2">Pages</p>
            <button onClick={() => setCatFilter(null)}
              className={`w-full text-left px-2 py-1 rounded-md text-xs cursor-pointer transition ${!catFilter ? "bg-zinc-800/80 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}>
              All ({project.screens.length})
            </button>
            {categories.map(([cat, count]) => (
              <button key={cat} onClick={() => setCatFilter(cat === catFilter ? null : cat)}
                className={`w-full text-left px-2 py-1 rounded-md text-xs cursor-pointer transition truncate ${catFilter === cat ? "bg-zinc-800/80 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}>
                {cat} <span className="text-zinc-700">({count})</span>
              </button>
            ))}
          </div>

          {/* Connection stats */}
          {project.connections.length > 0 && (
            <div className="p-3 border-t border-zinc-800/60">
              <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">Flows</p>
              {project.connections.slice(0, 5).map((c) => {
                const src = project.screens.find((s) => s.id === c.sourceScreenId);
                const tgt = project.screens.find((s) => s.id === c.targetScreenId);
                const h = src?.hotspots.find((h) => h.id === c.sourceHotspotId);
                return <p key={c.id} className="text-[10px] text-zinc-600 truncate">{src?.name} → <span className="text-zinc-500">{h?.label}</span> → {tgt?.name}</p>;
              })}
              {project.connections.length > 5 && <p className="text-[10px] text-zinc-700">+{project.connections.length - 5} more</p>}
            </div>
          )}
        </aside>

        {/* ── Grid ── */}
        <main className="flex-1 overflow-y-auto p-4">
          {screens.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">{search ? `No matches for "${search}"` : "No screens"}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {screens.map((sc) => <ScreenCard key={sc.id} screen={sc} selected={selectedId === sc.id} onClick={() => selectScreen(sc.id === selectedId ? null : sc.id)} />)}
            </div>
          )}
        </main>

        {/* ── Detail Panel ── */}
        {selected && <DetailPanel screen={selected} onClose={() => selectScreen(null)} />}
      </div>

      {connecting && <ConnectModal />}
    </div>
  );
}

/* ── Screen Card ── */
function ScreenCard({ screen, selected, onClick }: { screen: Screen; selected: boolean; onClick: () => void }) {
  const flows = useStore((s) => s.project?.connections.filter((c) => c.sourceScreenId === screen.id || c.targetScreenId === screen.id).length || 0);
  return (
    <div onClick={onClick}
      className={`group rounded-lg border overflow-hidden cursor-pointer transition-all ${selected ? "border-indigo-500/50 ring-1 ring-indigo-500/20" : "border-zinc-800/50 hover:border-zinc-700"}`}>
      <div className="aspect-[3/5] max-h-48 bg-zinc-950 overflow-hidden relative">
        {screen.imageUrl ? (
          <img src={screen.imageUrl} alt={screen.name} className="w-full h-full object-cover object-top" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-600 rounded-full animate-spin" /></div>
        )}
        {screen.isStartScreen && <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500/90 text-[9px] font-bold text-black rounded">START</span>}
        {flows > 0 && <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-emerald-500/90 text-[9px] font-bold text-black rounded">{flows}</span>}
      </div>
      <div className="px-2.5 py-2 bg-zinc-900/40">
        <p className="text-xs font-medium text-zinc-200 truncate">{screen.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-zinc-500">{screen.hotspots.length} actions</span>
          {screen.hotspots.length > 0 && (
            <div className="flex gap-0.5 ml-1">
              {[...new Set(screen.hotspots.map((h) => h.elementType))].slice(0, 3).map((t) => (
                <span key={t} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ELEMENT_COLORS[t] || "#666" }} />
              ))}
            </div>
          )}
        </div>
        <p className="text-[9px] text-zinc-600 mt-0.5 truncate">{screen.category}{screen.subcategory ? ` / ${screen.subcategory}` : ""}</p>
      </div>
    </div>
  );
}

/* ── Detail Panel ── */
function DetailPanel({ screen, onClose }: { screen: Screen; onClose: () => void }) {
  const conns = useStore((s) => s.project!.connections);
  const allScreens = useStore((s) => s.project!.screens);
  const { startConnect, setStartScreen, removeConnection } = useStore();

  return (
    <aside className="w-80 lg:w-96 border-l border-zinc-800/60 overflow-y-auto shrink-0 bg-[#0c0c0d]">
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100 truncate">{screen.name}</h2>
          <p className="text-[10px] text-zinc-500 truncate">{screen.category}{screen.subcategory ? ` / ${screen.subcategory}` : ""} · {screen.imageWidth}×{screen.imageHeight}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!screen.isStartScreen && <button onClick={() => setStartScreen(screen.id)} className="text-[10px] text-zinc-600 hover:text-amber-400 cursor-pointer">Set start</button>}
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-sm">✕</button>
        </div>
      </div>

      {screen.imageUrl && (
        <div className="p-3">
          <div className="rounded-lg overflow-hidden border border-zinc-800/50">
            <HotspotOverlay imageUrl={screen.imageUrl} hotspots={screen.hotspots} onHotspotClick={(h) => startConnect(h.id)} scale={0.55} />
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-2">Actions ({screen.hotspots.length})</p>
        {screen.hotspots.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No action-* nodes in this frame</p>
        ) : (
          <div className="space-y-1">
            {screen.hotspots.map((h) => {
              const conn = conns.find((c) => c.sourceHotspotId === h.id);
              const tgt = conn?.targetScreenId ? allScreens.find((s) => s.id === conn.targetScreenId) : null;
              return (
                <div key={h.id} className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/40 rounded-md group">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0 px-1.5 py-px rounded text-[9px] font-semibold"
                      style={{ backgroundColor: `${ELEMENT_COLORS[h.elementType]}22`, color: ELEMENT_COLORS[h.elementType] }}>
                      {h.elementType}
                    </span>
                    <span className="text-xs text-zinc-300 truncate">{h.label}</span>
                  </div>
                  {tgt ? (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-[10px] text-emerald-400">→ {tgt.name}</span>
                      <button onClick={() => removeConnection(conn!.id)} className="text-[10px] text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => startConnect(h.id)} className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0 ml-2">Connect →</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── Connect Modal ── */
function ConnectModal() {
  const project = useStore((s) => s.project!);
  const hid = useStore((s) => s.connectingHotspotId);
  const { cancelConnect, connectTo } = useStore();
  const [action, setAction] = useState<ConnectionAction>("navigate");
  const [transition, setTransition] = useState<TransitionType>("push");

  let hotspot: Hotspot | undefined, srcScreen: Screen | undefined;
  for (const sc of project.screens) { const h = sc.hotspots.find((h) => h.id === hid); if (h) { hotspot = h; srcScreen = sc; break; } }
  if (!hotspot || !srcScreen) return null;

  const targets = project.screens.filter((s) => s.id !== srcScreen!.id);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={cancelConnect}>
      <div className="bg-[#111113] border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-100">Connect &ldquo;{hotspot.label}&rdquo;</p>
            <p className="text-[11px] text-zinc-500">from {srcScreen.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={action} onChange={(e) => setAction(e.target.value as ConnectionAction)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300">
              <option value="navigate">Navigate</option><option value="open_overlay">Overlay</option><option value="back">Back</option><option value="open_url">URL</option>
            </select>
            <select value={transition} onChange={(e) => setTransition(e.target.value as TransitionType)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300">
              <option value="push">Push</option><option value="fade">Fade</option><option value="slide-left">Slide left</option><option value="none">None</option>
            </select>
            <button onClick={cancelConnect} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {targets.map((sc) => (
              <button key={sc.id} onClick={() => connectTo(sc.id, action, transition)}
                className="group rounded-lg border border-zinc-800/50 hover:border-indigo-500/50 bg-zinc-950 overflow-hidden cursor-pointer transition text-left">
                <div className="aspect-[3/5] max-h-28 bg-zinc-950 overflow-hidden">
                  {sc.imageUrl ? <img src={sc.imageUrl} alt="" className="w-full h-full object-cover object-top" loading="lazy" /> : <div className="w-full h-full" />}
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] font-medium text-zinc-400 truncate group-hover:text-indigo-400 transition">{sc.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Player ── */
function PlayerView() {
  const project = useStore((s) => s.project!);
  const screenId = useStore((s) => s.playerScreenId);
  const history = useStore((s) => s.playerHistory);
  const { playerNav, playerBack, stopPlayer } = useStore();
  const [showHints, setShowHints] = useState(false);

  const screen = project.screens.find((s) => s.id === screenId);
  if (!screen) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="h-10 bg-zinc-950 border-b border-zinc-800/40 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <button onClick={stopPlayer} className="text-zinc-400 hover:text-zinc-200 cursor-pointer">✕ Exit</button>
          <button onClick={playerBack} disabled={history.length === 0} className="text-zinc-400 hover:text-zinc-200 disabled:text-zinc-700 cursor-pointer disabled:cursor-not-allowed">← Back</button>
          <span className="text-zinc-300 font-medium">{screen.name}</span>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer select-none">
          <input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} className="accent-indigo-500" />
          Show hotspots
        </label>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        {screen.imageUrl ? (
          <div className="max-w-xs rounded-xl overflow-hidden shadow-2xl border border-zinc-800/30">
            <HotspotOverlay imageUrl={screen.imageUrl}
              hotspots={screen.hotspots.filter((h) => h.connectionId)} playerMode={!showHints}
              onHotspotClick={(h) => {
                const c = project.connections.find((c) => c.sourceHotspotId === h.id);
                if (c?.targetScreenId) playerNav(c.targetScreenId);
              }} />
          </div>
        ) : <p className="text-zinc-600 text-sm">No image</p>}
      </div>
    </div>
  );
}

/* ── Tiny button helper ── */
function Btn({ children, onClick, accent, danger }: { children: React.ReactNode; onClick: () => void; accent?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 text-[11px] rounded-md cursor-pointer transition font-medium ${
        accent ? "bg-indigo-600 hover:bg-indigo-500 text-white"
        : danger ? "text-zinc-600 hover:text-red-400"
        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
      }`}>{children}</button>
  );
}
