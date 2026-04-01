"use client";

import { useState, useCallback, useRef } from "react";
import { useFlowLensStore } from "@/lib/store";
import { ELEMENT_COLORS } from "@/lib/types";
import type { Hotspot, Screen, ActionType, TransitionType } from "@/lib/types";
import { generateMarkdown } from "@/lib/export";
import HotspotOverlay from "@/components/editor/HotspotOverlay";

// ── Helper: read image file ──────────────────────────────────────
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function Home() {
  const store = useFlowLensStore();

  // If not connected, show connect screen
  if (!store.figma.connected || !store.project) {
    return <ConnectView />;
  }

  // If connected, show editor
  return <EditorView />;
}

// ═══════════════════════════════════════════════════════════════════
// CONNECT VIEW
// ═══════════════════════════════════════════════════════════════════

function ConnectView() {
  const { figma, setFigmaToken, setFigmaFileUrl, connectFigma } = useFlowLensStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">FlowLens</h1>
            <p className="text-sm text-zinc-500">Visual prototype & flow builder</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Figma Personal Access Token</label>
            <input
              type="password"
              placeholder="figd_xxxxxxxxxxxx"
              value={figma.token}
              onChange={(e) => setFigmaToken(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              Settings → Security → Personal access tokens → <span className="text-zinc-500">file_content:read</span> scope
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Figma File URL</label>
            <input
              type="text"
              placeholder="https://www.figma.com/design/XXXXX/My-File"
              value={figma.fileUrl}
              onChange={(e) => setFigmaFileUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <button
            onClick={connectFigma}
            disabled={figma.loading || !figma.token || !figma.fileKey}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {figma.loading ? "Connecting..." : "Connect & Analyze"}
          </button>

          {figma.error && (
            <div className="px-3.5 py-2.5 bg-red-950/50 border border-red-900/50 rounded-lg text-sm text-red-400">
              {figma.error}
            </div>
          )}
        </div>

        {/* Naming convention hint */}
        <div className="mt-6 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Naming convention</h3>
          <p className="text-xs text-zinc-500 mb-3">
            Name interactive elements in Figma with: <code className="text-violet-400">action-{"{"}<span className="text-blue-400">type</span>{"}"}-{"{"}<span className="text-amber-400">label</span>{"}"}</code>
          </p>
          <div className="space-y-1 text-xs font-mono text-zinc-500">
            <p><span className="text-zinc-400">action-button-deposit</span> → button: Deposit</p>
            <p><span className="text-zinc-400">action-link-settings</span> → link: Settings</p>
            <p><span className="text-zinc-400">action-nav-home</span> → nav-item: Home</p>
            <p><span className="text-zinc-400">action-icon-back</span> → icon-button: Back</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EDITOR VIEW
// ═══════════════════════════════════════════════════════════════════

function EditorView() {
  const store = useFlowLensStore();
  const project = store.project!;
  const [tab, setTab] = useState<"screens" | "flow" | "player">("screens");
  const [connectingHotspot, setConnectingHotspot] = useState<{
    screenId: string;
    hotspotId: string;
  } | null>(null);

  const screensWithImages = project.screens.filter((s) => s.imageDataUrl);
  const totalActions = project.screens.reduce((sum, s) => sum + s.hotspots.length, 0);
  const totalConnections = project.connections.length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">{project.name}</h1>
            <p className="text-xs text-zinc-500">
              {project.screens.length} screens · {totalActions} actions · {totalConnections} connections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex bg-zinc-900 rounded-lg p-0.5 text-xs">
            {(["screens", "flow", "player"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-md capitalize transition-colors cursor-pointer ${
                  tab === t
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={() => {
              const md = generateMarkdown(project);
              navigator.clipboard.writeText(md);
              alert("Markdown copied to clipboard!");
            }}
            className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Export MD
          </button>

          <button
            onClick={() => {
              const json = store.exportProjectJSON();
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${project.name}-flowlens.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Export JSON
          </button>

          <button
            onClick={store.disconnect}
            className="px-3 py-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === "screens" && (
          <ScreensTab
            connectingHotspot={connectingHotspot}
            onStartConnect={(screenId, hotspotId) =>
              setConnectingHotspot({ screenId, hotspotId })
            }
            onCancelConnect={() => setConnectingHotspot(null)}
          />
        )}
        {tab === "flow" && <FlowTab />}
        {tab === "player" && <PlayerTab />}
      </main>

      {/* Connection modal */}
      {connectingHotspot && (
        <ConnectionModal
          sourceScreenId={connectingHotspot.screenId}
          sourceHotspotId={connectingHotspot.hotspotId}
          onClose={() => setConnectingHotspot(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCREENS TAB
// ═══════════════════════════════════════════════════════════════════

function ScreensTab({
  connectingHotspot,
  onStartConnect,
  onCancelConnect,
}: {
  connectingHotspot: { screenId: string; hotspotId: string } | null;
  onStartConnect: (screenId: string, hotspotId: string) => void;
  onCancelConnect: () => void;
}) {
  const project = useFlowLensStore((s) => s.project!);
  const uploadScreenImage = useFlowLensStore((s) => s.uploadScreenImage);
  const setStartScreen = useFlowLensStore((s) => s.setStartScreen);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);

  const selectedScreen = project.screens.find((s) => s.id === selectedScreenId);

  return (
    <div className="flex h-full">
      {/* Screen list (left sidebar) */}
      <div className="w-72 border-r border-zinc-800 overflow-y-auto p-4 space-y-2 shrink-0">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Screens ({project.screens.length})
        </h2>
        {project.screens.map((screen) => (
          <div
            key={screen.id}
            onClick={() => setSelectedScreenId(screen.id)}
            className={`p-3 rounded-xl border cursor-pointer transition-colors ${
              selectedScreenId === screen.id
                ? "bg-zinc-800/80 border-zinc-700"
                : "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-200 truncate">
                {screen.isStartScreen && <span className="text-amber-400 mr-1">⭐</span>}
                {screen.name}
              </span>
              {!screen.isStartScreen && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStartScreen(screen.id); }}
                  className="text-xs text-zinc-600 hover:text-amber-400 cursor-pointer"
                  title="Set as start screen"
                >
                  ☆
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{screen.hotspots.length} actions</span>
              <span>·</span>
              <span>{screen.imageDataUrl ? "✓ image" : "no image"}</span>
            </div>
            {/* Action type pills */}
            {screen.hotspots.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(
                  screen.hotspots.reduce<Record<string, number>>((acc, h) => {
                    acc[h.elementType] = (acc[h.elementType] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <span
                    key={type}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: `${ELEMENT_COLORS[type as keyof typeof ELEMENT_COLORS] || "#666"}22`,
                      color: ELEMENT_COLORS[type as keyof typeof ELEMENT_COLORS] || "#888",
                    }}
                  >
                    {type} {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Screen detail (right area) */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedScreen ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Select a screen from the sidebar
          </div>
        ) : (
          <ScreenDetail
            screen={selectedScreen}
            onUpload={async (file) => {
              const dataUrl = await readFile(file);
              uploadScreenImage(selectedScreen.id, dataUrl);
            }}
            onHotspotClick={(h) => onStartConnect(selectedScreen.id, h.id)}
          />
        )}
      </div>
    </div>
  );
}

// ── Screen Detail ────────────────────────────────────────────────

function ScreenDetail({
  screen,
  onUpload,
  onHotspotClick,
}: {
  screen: Screen;
  onUpload: (file: File) => void;
  onHotspotClick: (h: Hotspot) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const connections = useFlowLensStore((s) => s.project!.connections);
  const allScreens = useFlowLensStore((s) => s.project!.screens);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{screen.name}</h2>
          <p className="text-xs text-zinc-500">
            Frame: {screen.figmaFrameId} · {screen.frameDimensions.w}×{screen.frameDimensions.h} · {screen.hotspots.length} actions
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-colors"
        >
          {screen.imageDataUrl ? "Replace Image" : "Upload Screenshot"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </div>

      {/* Image with hotspot overlays */}
      {screen.imageDataUrl ? (
        <div className="max-w-2xl rounded-xl overflow-hidden border border-zinc-800">
          <HotspotOverlay
            imageUrl={screen.imageDataUrl}
            hotspots={screen.hotspots}
            onHotspotClick={onHotspotClick}
          />
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="max-w-2xl h-80 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <p className="text-sm mb-1">Drop a screenshot here</p>
          <p className="text-xs text-zinc-700">or click to browse</p>
        </div>
      )}

      {/* Actions list */}
      <div className="mt-6 max-w-2xl">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Detected actions</h3>
        {screen.hotspots.length === 0 ? (
          <p className="text-xs text-zinc-600">
            No <code className="text-violet-400">action-*</code> nodes found in this frame.
          </p>
        ) : (
          <div className="space-y-2">
            {screen.hotspots.map((h) => {
              const conn = connections.find((c) => c.sourceHotspotId === h.id);
              const target = conn
                ? allScreens.find((s) => s.id === conn.targetScreenId)
                : null;

              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: `${ELEMENT_COLORS[h.elementType] || "#666"}22`,
                        color: ELEMENT_COLORS[h.elementType] || "#888",
                      }}
                    >
                      {h.elementType}
                    </span>
                    <span className="text-sm text-zinc-200">{h.label}</span>
                    <span className="text-xs text-zinc-600 font-mono">{h.rawName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {target ? (
                      <span className="text-xs text-emerald-400">
                        → {target.name} ({conn!.action})
                      </span>
                    ) : (
                      <button
                        onClick={() => onHotspotClick(h)}
                        className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Connect →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONNECTION MODAL
// ═══════════════════════════════════════════════════════════════════

function ConnectionModal({
  sourceScreenId,
  sourceHotspotId,
  onClose,
}: {
  sourceScreenId: string;
  sourceHotspotId: string;
  onClose: () => void;
}) {
  const project = useFlowLensStore((s) => s.project!);
  const connectHotspot = useFlowLensStore((s) => s.connectHotspot);
  const [action, setAction] = useState<ActionType>("navigate");
  const [transition, setTransition] = useState<TransitionType>("push");

  const sourceScreen = project.screens.find((s) => s.id === sourceScreenId);
  const hotspot = sourceScreen?.hotspots.find((h) => h.id === sourceHotspotId);
  const otherScreens = project.screens.filter((s) => s.id !== sourceScreenId);

  if (!hotspot) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Connect action</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              <span
                className="font-medium"
                style={{ color: ELEMENT_COLORS[hotspot.elementType] }}
              >
                {hotspot.label}
              </span>
              {" "}on {sourceScreen?.name} → where does it go?
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-lg">✕</button>
        </div>

        {/* Options */}
        <div className="px-5 py-3 border-b border-zinc-800 flex gap-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as ActionType)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200"
            >
              <option value="navigate">Navigate</option>
              <option value="modal">Open Modal</option>
              <option value="back">Go Back</option>
              <option value="external">External Link</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Transition</label>
            <select
              value={transition}
              onChange={(e) => setTransition(e.target.value as TransitionType)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200"
            >
              <option value="push">Push</option>
              <option value="fade">Fade</option>
              <option value="slide-left">Slide Left</option>
              <option value="slide-right">Slide Right</option>
              <option value="slide-up">Slide Up</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        {/* Screen grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs text-zinc-500 mb-3">Select target screen:</p>
          <div className="grid grid-cols-3 gap-3">
            {otherScreens.map((screen) => (
              <button
                key={screen.id}
                onClick={() => {
                  connectHotspot(sourceScreenId, sourceHotspotId, screen.id, action, transition);
                  onClose();
                }}
                className="group p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-blue-500/50 transition-colors cursor-pointer text-left"
              >
                {screen.imageDataUrl ? (
                  <img
                    src={screen.imageDataUrl}
                    alt={screen.name}
                    className="w-full h-32 object-cover object-top rounded-lg mb-2"
                  />
                ) : (
                  <div className="w-full h-32 bg-zinc-900 rounded-lg mb-2 flex items-center justify-center text-zinc-700 text-xs">
                    No image
                  </div>
                )}
                <p className="text-xs font-medium text-zinc-300 truncate">{screen.name}</p>
                <p className="text-xs text-zinc-600">{screen.hotspots.length} actions</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FLOW TAB
// ═══════════════════════════════════════════════════════════════════

function FlowTab() {
  const project = useFlowLensStore((s) => s.project!);
  const allScreens = project.screens;

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="text-sm font-medium text-zinc-400 mb-4">
        Flow Graph — {project.connections.length} connections
      </h2>

      {project.connections.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 text-sm">
          <p>No connections yet.</p>
          <p className="text-xs mt-1">Go to Screens tab → click &quot;Connect&quot; on any action.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {project.connections.map((conn) => {
            const src = allScreens.find((s) => s.id === conn.sourceScreenId);
            const tgt = allScreens.find((s) => s.id === conn.targetScreenId);
            const hotspot = src?.hotspots.find((h) => h.id === conn.sourceHotspotId);

            return (
              <div
                key={conn.id}
                className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-300 font-medium">{src?.name}</span>
                    <span className="text-zinc-600">→</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${ELEMENT_COLORS[hotspot?.elementType || "button"]}22`,
                        color: ELEMENT_COLORS[hotspot?.elementType || "button"],
                      }}
                    >
                      {hotspot?.label}
                    </span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-zinc-300 font-medium">{tgt?.name}</span>
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {conn.action} · {conn.transition}
                  </div>
                </div>
                <button
                  onClick={() => useFlowLensStore.getState().removeConnection(conn.id)}
                  className="text-xs text-zinc-600 hover:text-red-400 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PLAYER TAB
// ═══════════════════════════════════════════════════════════════════

function PlayerTab() {
  const project = useFlowLensStore((s) => s.project!);
  const [currentScreenId, setCurrentScreenId] = useState<string | null>(() => {
    const start = project.screens.find((s) => s.isStartScreen);
    return start?.id || project.screens[0]?.id || null;
  });
  const [history, setHistory] = useState<string[]>([]);
  const [showHotspots, setShowHotspots] = useState(false);

  const currentScreen = project.screens.find((s) => s.id === currentScreenId);

  const navigate = useCallback(
    (targetScreenId: string) => {
      if (currentScreenId) {
        setHistory((h) => [...h, currentScreenId]);
      }
      setCurrentScreenId(targetScreenId);
    },
    [currentScreenId]
  );

  const goBack = useCallback(() => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory((h) => h.slice(0, -1));
      setCurrentScreenId(prev);
    }
  }, [history]);

  if (!currentScreen) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        No screens available
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Player toolbar */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={history.length === 0}
            className="text-xs text-zinc-400 hover:text-zinc-200 disabled:text-zinc-700 cursor-pointer disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <span className="text-sm text-zinc-300 font-medium">{currentScreen.name}</span>
          <span className="text-xs text-zinc-600">
            ({history.length + 1} in history)
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showHotspots}
            onChange={(e) => setShowHotspots(e.target.checked)}
            className="accent-blue-500"
          />
          Show hotspots
        </label>
      </div>

      {/* Player content */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-8 bg-zinc-950">
        {currentScreen.imageDataUrl ? (
          <div className="max-w-md rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
            <HotspotOverlay
              imageUrl={currentScreen.imageDataUrl}
              hotspots={currentScreen.hotspots.filter((h) => h.connectionId)}
              playerMode={!showHotspots}
              onHotspotClick={(h) => {
                const conn = project.connections.find(
                  (c) => c.sourceHotspotId === h.id
                );
                if (conn) navigate(conn.targetScreenId);
              }}
            />
          </div>
        ) : (
          <div className="text-center text-zinc-600 text-sm">
            <p>No screenshot uploaded for this screen.</p>
            <p className="text-xs mt-1">Go to Screens tab to upload one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
