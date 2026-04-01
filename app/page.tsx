"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "@/lib/store";
import { ELEMENT_COLORS } from "@/lib/types";
import type { Hotspot, Screen, ActionType, TransitionType } from "@/lib/types";
import { generateMarkdown } from "@/lib/export";
import HotspotOverlay from "@/components/editor/HotspotOverlay";

// ═══════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════

export default function Home() {
  const project = useStore((s) => s.project);
  const view = useStore((s) => s.view);

  // Load token from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("fl_token");
    if (saved) useStore.getState().setFigmaToken(saved);
  }, []);

  if (!project) return <WelcomePage />;
  if (view === "player") return <PlayerView />;
  return <DashboardPage />;
}

// ═══════════════════════════════════════════════════════════════════
// WELCOME / CONNECT PAGE
// ═══════════════════════════════════════════════════════════════════

function WelcomePage() {
  const { figmaToken, loading, error, setFigmaToken, loadFigmaFile } = useStore();
  const [fileUrl, setFileUrl] = useState("");

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left: branding */}
      <div className="hidden lg:flex w-[480px] bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border-r border-zinc-800/50 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold">F</div>
            <span className="text-lg font-semibold text-zinc-100">FlowLens</span>
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 leading-tight mb-4">
            Turn Figma files into<br />playable prototypes
          </h2>
          <p className="text-zinc-500 leading-relaxed">
            Name your interactive components with <code className="text-violet-400 bg-zinc-800/50 px-1.5 py-0.5 rounded text-sm">action-button-deposit</code> and FlowLens does the rest — auto-detects every element, pulls screenshots, and lets you build flows visually.
          </p>
        </div>
        <div className="space-y-3 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">✓</span>
            Auto-renders frame screenshots from Figma
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">✓</span>
            Detects actions via naming convention
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">✓</span>
            Zero cost — Figma API is free
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1 lg:hidden">FlowLens</h1>
          <p className="text-zinc-500 mb-8">Connect your Figma file to get started</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Personal Access Token</label>
              <input
                type="password"
                placeholder="figd_xxxx..."
                value={figmaToken}
                onChange={(e) => setFigmaToken(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition"
              />
              <p className="text-xs text-zinc-600 mt-1">Figma → Settings → Security → Personal access tokens</p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">File URL</label>
              <input
                type="text"
                placeholder="https://figma.com/design/..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition"
              />
            </div>

            <button
              onClick={() => loadFigmaFile(fileUrl)}
              disabled={loading || !figmaToken || !fileUrl}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl text-sm transition cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing file...
                </span>
              ) : (
                "Connect & Load"
              )}
            </button>

            {error && (
              <div className="px-4 py-3 bg-red-950/40 border border-red-900/40 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Convention reference */}
          <div className="mt-10 p-5 bg-zinc-900/40 border border-zinc-800/40 rounded-xl">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Naming convention</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-mono">
              <span className="text-zinc-400">action-button-deposit</span>
              <span className="text-blue-400">→ button</span>
              <span className="text-zinc-400">action-link-settings</span>
              <span className="text-cyan-400">→ link</span>
              <span className="text-zinc-400">action-nav-home</span>
              <span className="text-zinc-500">→ nav-item</span>
              <span className="text-zinc-400">action-icon-back</span>
              <span className="text-violet-400">→ icon-button</span>
              <span className="text-zinc-400">action-input-search</span>
              <span className="text-amber-400">→ input</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function DashboardPage() {
  const project = useStore((s) => s.project!);
  const loadingImages = useStore((s) => s.loadingImages);
  const searchQuery = useStore((s) => s.searchQuery);
  const categoryFilter = useStore((s) => s.categoryFilter);
  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const connectingHotspotId = useStore((s) => s.connectingHotspotId);
  const { setSearch, setCategoryFilter, selectScreen, setView, disconnect, startPlayer } = useStore();

  // Categories from screens
  const categories = useMemo(() => {
    const cats = new Set(project.screens.map((s) => s.category));
    return Array.from(cats).sort();
  }, [project.screens]);

  // Filtered screens
  const filtered = useMemo(() => {
    let screens = project.screens;
    if (categoryFilter) screens = screens.filter((s) => s.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      screens = screens.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.hotspots.some((h) => h.label.toLowerCase().includes(q) || h.rawName.toLowerCase().includes(q))
      );
    }
    return screens;
  }, [project.screens, categoryFilter, searchQuery]);

  const totalActions = project.screens.reduce((n, s) => n + s.hotspots.length, 0);
  const selectedScreen = project.screens.find((s) => s.id === selectedScreenId);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">F</div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">{project.name}</h1>
            <p className="text-xs text-zinc-500">
              {project.screens.length} screens · {totalActions} actions · {project.connections.length} flows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={startPlayer} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg cursor-pointer transition">
            ▶ Play
          </button>
          <button
            onClick={() => {
              const md = generateMarkdown(project);
              navigator.clipboard.writeText(md);
            }}
            className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer transition"
          >
            Export
          </button>
          <button onClick={disconnect} className="px-3 py-1.5 text-xs text-zinc-600 hover:text-red-400 cursor-pointer transition">
            Disconnect
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: search + categories */}
        <aside className="w-56 border-r border-zinc-800/60 p-4 shrink-0 overflow-y-auto">
          {/* Search */}
          <input
            type="text"
            placeholder="Search screens..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 mb-4 transition"
          />

          {/* Categories */}
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Categories</h3>
          <div className="space-y-0.5">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                !categoryFilter ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All screens ({project.screens.length})
            </button>
            {categories.map((cat) => {
              const count = project.screens.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                    categoryFilter === cat ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-6 pt-4 border-t border-zinc-800/60">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Flows</h3>
            <p className="text-xs text-zinc-600">
              {project.connections.length} connection{project.connections.length !== 1 ? "s" : ""} defined
            </p>
            {project.connections.length > 0 && (
              <div className="mt-2 space-y-1">
                {project.connections.slice(0, 8).map((conn) => {
                  const src = project.screens.find((s) => s.id === conn.sourceScreenId);
                  const tgt = project.screens.find((s) => s.id === conn.targetScreenId);
                  const h = src?.hotspots.find((h) => h.id === conn.sourceHotspotId);
                  return (
                    <div key={conn.id} className="text-[10px] text-zinc-600 truncate">
                      {src?.name} → <span className="text-zinc-400">{h?.label}</span> → {tgt?.name}
                    </div>
                  );
                })}
                {project.connections.length > 8 && (
                  <p className="text-[10px] text-zinc-700">+{project.connections.length - 8} more</p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main: screen cards */}
        <main className="flex-1 overflow-y-auto">
          {loadingImages && (
            <div className="px-6 py-2 bg-blue-950/30 border-b border-blue-900/20 text-xs text-blue-400 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              Rendering frame screenshots from Figma...
            </div>
          )}

          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 text-sm">
                {searchQuery ? `No screens matching "${searchQuery}"` : "No screens found"}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((screen) => (
                  <ScreenCard
                    key={screen.id}
                    screen={screen}
                    isSelected={selectedScreenId === screen.id}
                    onClick={() => selectScreen(screen.id === selectedScreenId ? null : screen.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right panel: screen detail */}
        {selectedScreen && (
          <ScreenDetailPanel screen={selectedScreen} onClose={() => selectScreen(null)} />
        )}
      </div>

      {/* Connection modal */}
      {connectingHotspotId && <ConnectionModal />}
    </div>
  );
}

// ── Screen Card ──────────────────────────────────────────────────

function ScreenCard({ screen, isSelected, onClick }: { screen: Screen; isSelected: boolean; onClick: () => void }) {
  const connCount = useStore((s) => s.project?.connections.filter(
    (c) => c.sourceScreenId === screen.id || c.targetScreenId === screen.id
  ).length || 0);

  return (
    <div
      onClick={onClick}
      className={`group rounded-xl border overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500/50 bg-zinc-900 ring-1 ring-blue-500/20"
          : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-[9/16] max-h-52 bg-zinc-950 overflow-hidden relative">
        {screen.imageUrl ? (
          <img
            src={screen.imageUrl}
            alt={screen.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-zinc-800 border-t-zinc-600 rounded-full animate-spin" />
          </div>
        )}
        {/* Start badge */}
        {screen.isStartScreen && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500/90 text-[10px] font-bold text-black rounded">
            START
          </span>
        )}
        {/* Connection count */}
        {connCount > 0 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500/90 text-[10px] font-bold text-black rounded">
            {connCount} flow{connCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-zinc-200 truncate">{screen.name}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs text-zinc-500">{screen.hotspots.length} actions</span>
          {screen.hotspots.length > 0 && (
            <div className="flex gap-0.5 ml-1">
              {Object.entries(
                screen.hotspots.reduce<Record<string, number>>((a, h) => { a[h.elementType] = (a[h.elementType] || 0) + 1; return a; }, {})
              ).slice(0, 3).map(([type]) => (
                <span
                  key={type}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ELEMENT_COLORS[type as keyof typeof ELEMENT_COLORS] || "#666" }}
                />
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{screen.category}</p>
      </div>
    </div>
  );
}

// ── Screen Detail Panel ──────────────────────────────────────────

function ScreenDetailPanel({ screen, onClose }: { screen: Screen; onClose: () => void }) {
  const connections = useStore((s) => s.project!.connections);
  const allScreens = useStore((s) => s.project!.screens);
  const { startConnecting, setStartScreen } = useStore();

  return (
    <aside className="w-96 border-l border-zinc-800/60 overflow-y-auto shrink-0 bg-zinc-950">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{screen.name}</h2>
          <p className="text-xs text-zinc-500">{screen.category} · {screen.frameDimensions.w}×{screen.frameDimensions.h}</p>
        </div>
        <div className="flex items-center gap-2">
          {!screen.isStartScreen && (
            <button onClick={() => setStartScreen(screen.id)} className="text-xs text-zinc-600 hover:text-amber-400 cursor-pointer" title="Set as start">☆</button>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">✕</button>
        </div>
      </div>

      {/* Image preview with hotspots */}
      {screen.imageUrl && (
        <div className="p-4">
          <div className="rounded-xl overflow-hidden border border-zinc-800">
            <HotspotOverlay
              imageUrl={screen.imageUrl}
              hotspots={screen.hotspots}
              onHotspotClick={(h) => startConnecting(h.id)}
              scale={0.6}
            />
          </div>
        </div>
      )}

      {/* Actions list */}
      <div className="px-5 pb-5">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Actions ({screen.hotspots.length})
        </h3>
        {screen.hotspots.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No action-* nodes in this frame</p>
        ) : (
          <div className="space-y-1.5">
            {screen.hotspots.map((h) => {
              const conn = connections.find((c) => c.sourceHotspotId === h.id);
              const target = conn ? allScreens.find((s) => s.id === conn.targetScreenId) : null;

              return (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-zinc-900 border border-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${ELEMENT_COLORS[h.elementType] || "#666"}22`,
                        color: ELEMENT_COLORS[h.elementType] || "#888",
                      }}
                    >
                      {h.elementType}
                    </span>
                    <span className="text-xs text-zinc-200 truncate">{h.label}</span>
                  </div>
                  {target ? (
                    <span className="text-[10px] text-emerald-400 shrink-0 ml-2">→ {target.name}</span>
                  ) : (
                    <button
                      onClick={() => startConnecting(h.id)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer shrink-0 ml-2"
                    >
                      Connect →
                    </button>
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

// ═══════════════════════════════════════════════════════════════════
// CONNECTION MODAL
// ═══════════════════════════════════════════════════════════════════

function ConnectionModal() {
  const project = useStore((s) => s.project!);
  const connectingHotspotId = useStore((s) => s.connectingHotspotId);
  const { cancelConnecting, connectTo } = useStore();
  const [action, setAction] = useState<ActionType>("navigate");
  const [transition, setTransition] = useState<TransitionType>("push");

  // Find the hotspot
  let hotspot: Hotspot | undefined;
  let sourceScreen: Screen | undefined;
  for (const sc of project.screens) {
    const h = sc.hotspots.find((h) => h.id === connectingHotspotId);
    if (h) { hotspot = h; sourceScreen = sc; break; }
  }

  if (!hotspot || !sourceScreen) return null;
  const otherScreens = project.screens.filter((s) => s.id !== sourceScreen!.id);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={cancelConnecting}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Connect &ldquo;{hotspot.label}&rdquo;
            </h3>
            <p className="text-xs text-zinc-500">
              from <span className="text-zinc-400">{sourceScreen.name}</span> → select target screen
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={action} onChange={(e) => setAction(e.target.value as ActionType)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200">
              <option value="navigate">Navigate</option>
              <option value="modal">Modal</option>
              <option value="back">Back</option>
              <option value="external">External</option>
            </select>
            <select value={transition} onChange={(e) => setTransition(e.target.value as TransitionType)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200">
              <option value="push">Push</option>
              <option value="fade">Fade</option>
              <option value="slide-left">Slide Left</option>
              <option value="slide-right">Slide Right</option>
              <option value="none">None</option>
            </select>
            <button onClick={cancelConnecting} className="text-zinc-500 hover:text-zinc-300 text-lg cursor-pointer">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {otherScreens.map((screen) => (
              <button
                key={screen.id}
                onClick={() => connectTo(screen.id, action, transition)}
                className="group rounded-xl border border-zinc-800 hover:border-blue-500/50 bg-zinc-950 overflow-hidden cursor-pointer transition-all text-left"
              >
                <div className="aspect-[9/16] max-h-36 bg-zinc-950 overflow-hidden">
                  {screen.imageUrl ? (
                    <img src={screen.imageUrl} alt={screen.name} className="w-full h-full object-cover object-top" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-800 text-xs">No image</div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-zinc-300 truncate group-hover:text-blue-400 transition">{screen.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PLAYER VIEW
// ═══════════════════════════════════════════════════════════════════

function PlayerView() {
  const project = useStore((s) => s.project!);
  const playerScreenId = useStore((s) => s.playerScreenId);
  const playerHistory = useStore((s) => s.playerHistory);
  const { playerNavigate, playerGoBack, stopPlayer } = useStore();
  const [showOverlay, setShowOverlay] = useState(false);

  const screen = project.screens.find((s) => s.id === playerScreenId);
  if (!screen) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Player bar */}
      <div className="bg-zinc-950 border-b border-zinc-800/40 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={stopPlayer} className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">✕ Exit</button>
          <button onClick={playerGoBack} disabled={playerHistory.length === 0}
            className="text-xs text-zinc-400 hover:text-zinc-200 disabled:text-zinc-700 cursor-pointer disabled:cursor-not-allowed">
            ← Back
          </button>
          <span className="text-sm text-zinc-300 font-medium">{screen.name}</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer select-none">
          <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} className="accent-blue-500" />
          Show hotspots
        </label>
      </div>

      {/* Screen */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        {screen.imageUrl ? (
          <div className="max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/40">
            <HotspotOverlay
              imageUrl={screen.imageUrl}
              hotspots={screen.hotspots.filter((h) => h.connectionId)}
              playerMode={!showOverlay}
              onHotspotClick={(h) => {
                const conn = project.connections.find((c) => c.sourceHotspotId === h.id);
                if (conn) playerNavigate(conn.targetScreenId);
              }}
            />
          </div>
        ) : (
          <p className="text-zinc-600 text-sm">No screenshot for this screen</p>
        )}
      </div>
    </div>
  );
}
