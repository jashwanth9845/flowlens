"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { ELEMENT_COLORS, SCREEN_FILTERS, type Hotspot, type Screen, type ConnectionAction, type TransitionType } from "@/lib/types";
import { generateMarkdown } from "@/lib/export";
import HotspotOverlay from "@/components/editor/HotspotOverlay";

/* ================================================================ */
/* ROOT                                                              */
/* ================================================================ */
export default function Home() {
  const user = useStore((s) => s.user);
  const project = useStore((s) => s.project);
  const playerActive = useStore((s) => s.playerActive);
  const { setUser, loadProjects } = useStore();
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<"projects" | "settings">("projects");

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => { setUser(user ?? null); setReady(true); if (user) loadProjects(); });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => { setUser(s?.user ?? null); if (s?.user) loadProjects(); });
    return () => subscription.unsubscribe();
  }, [setUser, loadProjects]);

  if (!ready) return <Spinner />;
  if (!user) { if (typeof window !== "undefined") window.location.href = "/login"; return <Spinner />; }
  if (playerActive && project) return <Player />;
  if (project) return <Workspace onBack={() => useStore.getState().goBack()} />;
  return page === "settings" ? <Settings onBack={() => setPage("projects")} /> : <Projects onSettings={() => setPage("settings")} />;
}

function Spinner() { return <div className="min-h-screen flex items-center justify-center"><div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" /></div>; }

/* ================================================================ */
/* PROJECTS LIST                                                     */
/* ================================================================ */
function Projects({ onSettings }: { onSettings: () => void }) {
  const user = useStore((s) => s.user);
  const projects = useStore((s) => s.projects);
  const { loadProject, deleteProject, signOut } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [newMode, setNewMode] = useState<"figma" | "manual" | null>(null);

  return (
    <div className="min-h-screen">
      <Nav>
        <div className="flex items-center gap-3">
          {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" className="w-6 h-6 rounded-full" />}
          <span className="text-xs text-zinc-500 hidden sm:inline">{user?.email}</span>
          <button onClick={onSettings} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer">Settings</button>
          <button onClick={signOut} className="text-xs text-zinc-600 hover:text-red-400 cursor-pointer">Sign out</button>
        </div>
      </Nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Projects</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Import from Figma or upload screenshots manually.</p>
          </div>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg cursor-pointer transition">
            + New project
          </button>
        </div>

        {projects.length === 0 && !showNew ? (
          <div className="text-center py-24 border border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-500 text-sm mb-1">No projects yet</p>
            <p className="text-zinc-600 text-xs mb-4">Create one from a Figma file or upload screenshots manually.</p>
            <button onClick={() => setShowNew(true)} className="text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">Create your first project →</button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-start justify-between p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl hover:border-zinc-700 transition group cursor-pointer"
                onClick={() => loadProject(p.id)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{p.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.figma_file_name || "Manual project"}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{new Date(p.updated_at).toLocaleDateString()}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this project?")) deleteProject(p.id); }}
                  className="text-xs text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer transition shrink-0 ml-3">Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* New project modal */}
        {showNew && (
          <Modal onClose={() => { setShowNew(false); setNewMode(null); }}>
            {!newMode ? (
              <div>
                <h2 className="text-base font-semibold text-zinc-100 mb-1">New project</h2>
                <p className="text-xs text-zinc-500 mb-5">How do you want to add screens?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setNewMode("figma")}
                    className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 cursor-pointer transition text-left group">
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-indigo-400 transition">Import from Figma</p>
                    <p className="text-xs text-zinc-500 mt-1">Auto-detect screens, actions, and pull screenshots.</p>
                  </button>
                  <button onClick={() => setNewMode("manual")}
                    className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 cursor-pointer transition text-left group">
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-indigo-400 transition">Upload screenshots</p>
                    <p className="text-xs text-zinc-500 mt-1">Drag and drop images. No Figma needed.</p>
                  </button>
                </div>
              </div>
            ) : newMode === "figma" ? (
              <FigmaImport onDone={() => { setShowNew(false); setNewMode(null); }} />
            ) : (
              <ManualImport onDone={() => { setShowNew(false); setNewMode(null); }} />
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}

/* ── Figma Import Form ── */
function FigmaImport({ onDone }: { onDone: () => void }) {
  const { loading, error, loadFigmaFile } = useStore();
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => { useStore.getState().getFigmaToken().then((t) => { if (t) setToken(t); }); }, []);

  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-100 mb-1">Import from Figma</h2>
      <p className="text-xs text-zinc-500 mb-4">Screens, actions, and screenshots are pulled automatically.</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Figma personal access token</label>
          <div className="relative">
            <input type={showToken ? "text" : "password"} placeholder="figd_..." value={token} onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 cursor-pointer text-xs" tabIndex={-1}>
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">Figma → Settings → Security → Personal access tokens</p>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">File URL</label>
          <input placeholder="https://figma.com/design/..." value={url} onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
        </div>
        <button onClick={async () => { await loadFigmaFile(url, token); if (!useStore.getState().error) onDone(); }} disabled={loading || !token || !url}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading && <Spin />} {loading ? "Importing..." : "Import file"}
        </button>
        {error && <Err msg={error} />}
      </div>
    </div>
  );
}

/* ── Manual Upload Form ── */
function ManualImport({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: proj } = await supabase.from("projects").insert({ owner_id: user.id, name: name.trim() }).select().single();
    if (!proj) { setLoading(false); return; }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const screenName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/^\d+\s*/, "").trim() || `Screen ${i + 1}`;

      // Upload to storage
      const path = `${proj.id}/manual_${crypto.randomUUID()}.png`;
      await supabase.storage.from("screenshots").upload(path, file, { contentType: file.type });
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${path}`;

      // Get dimensions
      const dims = await getImageDims(file);

      await supabase.from("screens").insert({
        project_id: proj.id, name: screenName, category: "Uploaded",
        image_url: publicUrl, cached_image_path: path,
        image_width: dims.w, image_height: dims.h,
        order: i, is_start_screen: i === 0,
      });
    }

    await useStore.getState().loadProjects();
    await useStore.getState().loadProject(proj.id);
    setLoading(false);
    onDone();
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-100 mb-1">Upload screenshots</h2>
      <p className="text-xs text-zinc-500 mb-4">No Figma needed. Drag and drop your screen images.</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Project name</label>
          <input placeholder="My App" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Screenshots ({files.length} selected)</label>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-600 transition"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setFiles((f) => [...f, ...Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"))]); }}>
            <p className="text-sm text-zinc-500">Drop images here or click to browse</p>
            <p className="text-[10px] text-zinc-600 mt-1">PNG, JPG, WebP</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files) setFiles((f) => [...f, ...Array.from(e.target.files!)]); }} />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {files.map((f, i) => (
                <span key={i} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400 flex items-center gap-1">
                  {f.name.slice(0, 20)}{f.name.length > 20 ? "..." : ""}
                  <button onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 cursor-pointer">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleCreate} disabled={loading || !name.trim() || files.length === 0}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading && <Spin />} {loading ? "Creating..." : `Create with ${files.length} screen${files.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

/* ================================================================ */
/* SETTINGS                                                          */
/* ================================================================ */
function Settings({ onBack }: { onBack: () => void }) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { useStore.getState().getFigmaToken().then((t) => { if (t) setToken(t); }); }, []);

  const save = async () => {
    await useStore.getState().saveFigmaToken(token);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <Nav><button onClick={onBack} className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">← Back to projects</button></Nav>
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Settings</h1>

        <div className="p-5 bg-zinc-900/40 border border-zinc-800/50 rounded-xl">
          <h2 className="text-sm font-medium text-zinc-200 mb-1">Figma integration</h2>
          <p className="text-xs text-zinc-500 mb-4">Store your Figma token so it&apos;s reused across imports. Go to Figma → Settings → Security → Personal access tokens.</p>

          <div className="relative mb-3">
            <input type={showToken ? "text" : "password"} placeholder="figd_..." value={token} onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-14 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition" />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 cursor-pointer text-xs" tabIndex={-1}>
              {showToken ? "Hide" : "Show"}
            </button>
          </div>

          <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg cursor-pointer transition">
            {saved ? "✓ Saved" : "Save token"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/* WORKSPACE                                                         */
/* ================================================================ */
function Workspace({ onBack }: { onBack: () => void }) {
  const project = useStore((s) => s.project!);
  const loadingImages = useStore((s) => s.loadingImages);
  const imageProgress = useStore((s) => s.imageProgress);
  const search = useStore((s) => s.search);
  const filter = useStore((s) => s.filter);
  const selectedId = useStore((s) => s.selectedScreenId);
  const connecting = useStore((s) => s.connectingHotspotId);
  const { setSearch, setFilter, selectScreen, startPlayer } = useStore();
  const [visible, setVisible] = useState(24);

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

  // Reset visible count when filters change
  useEffect(() => { setVisible(24); }, [catFilter, filter, search]);

  const visibleScreens = screens.slice(0, visible);
  const hasMore = visible < screens.length;
  const selected = project.screens.find((s) => s.id === selectedId);
  const total = project.screens.reduce((n, s) => n + s.hotspots.length, 0);
  const missingImages = project.screens.filter((s) => !s.imageUrl).length;

  // Refresh images for already-imported projects
  const handleRefreshImages = async () => {
    const token = await useStore.getState().getFigmaToken();
    if (token && project.figmaFileKey) {
      useStore.getState().fetchImages(token);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-12 border-b border-zinc-800/60 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer mr-1">←</button>
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">F</div>
          <span className="text-sm font-medium text-zinc-200 truncate max-w-[180px]">{project.name}</span>
          <span className="text-[10px] text-zinc-600 hidden sm:inline ml-1">{project.screens.length} screens · {total} actions · {project.connections.length} flows</span>
        </div>
        <div className="flex items-center gap-1.5">
          {missingImages > 0 && !loadingImages && project.figmaFileKey && (
            <BtnSm onClick={handleRefreshImages}>↻ Fetch {missingImages} images</BtnSm>
          )}
          <BtnSm onClick={startPlayer} accent>▶ Play</BtnSm>
          <BtnSm onClick={() => { const md = generateMarkdown(project); navigator.clipboard.writeText(md); }}>Export</BtnSm>
        </div>
      </header>

      {/* Progress bar for image caching */}
      {loadingImages && (
        <div className="border-b border-indigo-900/20 bg-indigo-950/20">
          <div className="px-4 py-2 flex items-center gap-3">
            <Spin />
            <span className="text-xs text-indigo-400">
              Caching screenshots... {imageProgress.done}/{imageProgress.total}
            </span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: imageProgress.total > 0 ? `${(imageProgress.done / imageProgress.total) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-[10px] text-zinc-500">
              {imageProgress.total > 0 ? Math.round((imageProgress.done / imageProgress.total) * 100) : 0}%
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 border-r border-zinc-800/60 flex flex-col shrink-0">
          <div className="p-3">
            <input placeholder="Search screens, actions..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-md text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 transition" />
          </div>
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
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mb-1 mt-2">Pages</p>
            <SideBtn active={!catFilter} onClick={() => setCatFilter(null)}>All ({project.screens.length})</SideBtn>
            {categories.map(([cat, count]) => (
              <SideBtn key={cat} active={catFilter === cat} onClick={() => setCatFilter(cat === catFilter ? null : cat)}>{cat} <span className="text-zinc-700">({count})</span></SideBtn>
            ))}
          </div>
        </aside>

        {/* Grid with pagination */}
        <main className="flex-1 overflow-y-auto p-4">
          {screens.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">{search ? `No matches` : "No screens"}</div>
          ) : (
            <>
              <p className="text-[10px] text-zinc-600 mb-3">
                Showing {Math.min(visible, screens.length)} of {screens.length} screens
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {visibleScreens.map((sc) => <Card key={sc.id} screen={sc} selected={selectedId === sc.id} onClick={() => selectScreen(sc.id === selectedId ? null : sc.id)} />)}
              </div>
              {hasMore && (
                <div className="mt-6 text-center">
                  <button onClick={() => setVisible((v) => v + 24)}
                    className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 cursor-pointer transition">
                    Load more ({screens.length - visible} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {selected && <Detail screen={selected} onClose={() => selectScreen(null)} />}
      </div>
      {connecting && <ConnectModal />}
    </div>
  );
}

/* ── Screen Card ── */
function Card({ screen, selected, onClick }: { screen: Screen; selected: boolean; onClick: () => void }) {
  const flows = useStore((s) => s.project?.connections.filter((c) => c.sourceScreenId === screen.id || c.targetScreenId === screen.id).length || 0);
  return (
    <div onClick={onClick} className={`group rounded-lg border overflow-hidden cursor-pointer transition-all ${selected ? "border-indigo-500/50 ring-1 ring-indigo-500/20" : "border-zinc-800/50 hover:border-zinc-700"}`}>
      <div className="aspect-[3/5] max-h-48 bg-zinc-950 overflow-hidden relative">
        {screen.imageUrl ? <img src={screen.imageUrl} alt={screen.name} className="w-full h-full object-cover object-top" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-zinc-800 text-xs">No image</div>}
        {screen.isStartScreen && <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500/90 text-[9px] font-bold text-black rounded">START</span>}
        {flows > 0 && <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-emerald-500/90 text-[9px] font-bold text-black rounded">{flows}</span>}
      </div>
      <div className="px-2.5 py-2 bg-zinc-900/40">
        <p className="text-xs font-medium text-zinc-200 truncate">{screen.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-zinc-500">{screen.hotspots.length} actions</span>
          {screen.hotspots.length > 0 && <div className="flex gap-0.5 ml-1">{[...new Set(screen.hotspots.map((h) => h.elementType))].slice(0,3).map((t) => <span key={t} className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:ELEMENT_COLORS[t]||"#666"}} />)}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Detail Panel ── */
function Detail({ screen, onClose }: { screen: Screen; onClose: () => void }) {
  const conns = useStore((s) => s.project!.connections);
  const allScreens = useStore((s) => s.project!.screens);
  const { startConnect, setStartScreen, removeConnection } = useStore();
  return (
    <aside className="w-80 lg:w-96 border-l border-zinc-800/60 overflow-y-auto shrink-0 bg-[#0c0c0d]">
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100 truncate">{screen.name}</h2>
          <p className="text-[10px] text-zinc-500">{screen.category} · {screen.imageWidth}×{screen.imageHeight}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!screen.isStartScreen && <button onClick={() => setStartScreen(screen.id)} className="text-[10px] text-zinc-600 hover:text-amber-400 cursor-pointer">Set start</button>}
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-sm">✕</button>
        </div>
      </div>
      {screen.imageUrl && <div className="p-3"><div className="rounded-lg overflow-hidden border border-zinc-800/50"><HotspotOverlay imageUrl={screen.imageUrl} hotspots={screen.hotspots} onHotspotClick={(h) => startConnect(h.id)} scale={0.55} /></div></div>}
      <div className="px-4 pb-4">
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-2">Actions ({screen.hotspots.length})</p>
        {screen.hotspots.length === 0 ? <p className="text-xs text-zinc-600 italic">No action nodes detected</p> : (
          <div className="space-y-1">{screen.hotspots.map((h) => {
            const conn = conns.find((c) => c.sourceHotspotId === h.id);
            const tgt = conn?.targetScreenId ? allScreens.find((s) => s.id === conn.targetScreenId) : null;
            return (<div key={h.id} className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/40 rounded-md group">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0 px-1.5 py-px rounded text-[9px] font-semibold" style={{backgroundColor:`${ELEMENT_COLORS[h.elementType]}22`,color:ELEMENT_COLORS[h.elementType]}}>{h.elementType}</span>
                <span className="text-xs text-zinc-300 truncate">{h.label}</span>
              </div>
              {tgt ? <div className="flex items-center gap-1 shrink-0 ml-2"><span className="text-[10px] text-emerald-400 truncate max-w-[80px]">→ {tgt.name}</span><button onClick={() => removeConnection(conn!.id)} className="text-[10px] text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer">✕</button></div>
                : <button onClick={() => startConnect(h.id)} className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0 ml-2">Connect →</button>}
            </div>);
          })}</div>
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
  return (
    <Modal onClose={cancelConnect}>
      <div className="flex items-center justify-between mb-4">
        <div><p className="text-sm font-medium text-zinc-100">Connect &ldquo;{hotspot.label}&rdquo;</p><p className="text-[11px] text-zinc-500">from {srcScreen.name}</p></div>
        <div className="flex items-center gap-2">
          <select value={action} onChange={(e) => setAction(e.target.value as ConnectionAction)} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300">
            <option value="navigate">Navigate</option><option value="open_overlay">Overlay</option><option value="back">Back</option><option value="open_url">URL</option>
          </select>
          <select value={transition} onChange={(e) => setTransition(e.target.value as TransitionType)} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300">
            <option value="push">Push</option><option value="fade">Fade</option><option value="slide-left">Slide left</option><option value="none">None</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto">{project.screens.filter((s) => s.id !== srcScreen!.id).map((sc) => (
        <button key={sc.id} onClick={() => connectTo(sc.id, action, transition)} className="group rounded-lg border border-zinc-800/50 hover:border-indigo-500/50 bg-zinc-950 overflow-hidden cursor-pointer transition text-left">
          <div className="aspect-[3/5] max-h-28 bg-zinc-950 overflow-hidden">{sc.imageUrl ? <img src={sc.imageUrl} alt="" className="w-full h-full object-cover object-top" loading="lazy" /> : <div className="w-full h-full" />}</div>
          <div className="p-1.5"><p className="text-[10px] font-medium text-zinc-400 truncate group-hover:text-indigo-400 transition">{sc.name}</p></div>
        </button>
      ))}</div>
    </Modal>
  );
}

/* ================================================================ */
/* PLAYER                                                            */
/* ================================================================ */
function Player() {
  const project = useStore((s) => s.project!);
  const screenId = useStore((s) => s.playerScreenId);
  const history = useStore((s) => s.playerHistory);
  const { playerNav, playerBack, stopPlayer } = useStore();
  const [hints, setHints] = useState(false);
  const screen = project.screens.find((s) => s.id === screenId);
  if (!screen) return null;
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="h-10 bg-zinc-950 border-b border-zinc-800/40 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <button onClick={stopPlayer} className="text-zinc-400 hover:text-zinc-200 cursor-pointer">✕ Exit</button>
          <button onClick={playerBack} disabled={history.length===0} className="text-zinc-400 hover:text-zinc-200 disabled:text-zinc-700 cursor-pointer disabled:cursor-not-allowed">← Back</button>
          <span className="text-zinc-300 font-medium">{screen.name}</span>
          <span className="text-zinc-600">{history.length + 1} in path</span>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer select-none">
          <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} className="accent-indigo-500" />Show hotspots
        </label>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        {screen.imageUrl ? (
          <div className="max-w-xs rounded-xl overflow-hidden shadow-2xl border border-zinc-800/30">
            <HotspotOverlay imageUrl={screen.imageUrl} hotspots={screen.hotspots.filter((h) => h.connectionId)} playerMode={!hints}
              onHotspotClick={(h) => { const c = project.connections.find((c) => c.sourceHotspotId === h.id); if (c?.targetScreenId) playerNav(c.targetScreenId); }} />
          </div>
        ) : <p className="text-zinc-600 text-sm">No image for this screen</p>}
      </div>
    </div>
  );
}

/* ================================================================ */
/* SHARED UI COMPONENTS                                              */
/* ================================================================ */
function Nav({ children }: { children: React.ReactNode }) {
  return (
    <header className="h-12 border-b border-zinc-800/60 px-5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">F</div>
        <span className="text-sm font-medium text-zinc-200">FlowLens</span>
      </div>
      {children}
    </header>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111113] border border-zinc-800 rounded-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function BtnSm({ children, onClick, accent }: { children: React.ReactNode; onClick: () => void; accent?: boolean }) {
  return <button onClick={onClick} className={`px-2.5 py-1 text-[11px] rounded-md cursor-pointer transition font-medium ${accent ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"}`}>{children}</button>;
}

function SideBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`w-full text-left px-2 py-1 rounded-md text-xs cursor-pointer transition truncate ${active ? "bg-zinc-800/80 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}>{children}</button>;
}

function LoadingBar({ text }: { text: string }) {
  return <div className="h-7 bg-indigo-950/30 border-b border-indigo-900/20 px-4 flex items-center gap-2 text-xs text-indigo-400"><Spin />{text}</div>;
}

function Spin() { return <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />; }
function Err({ msg }: { msg: string }) { return <div className="px-3.5 py-2.5 bg-red-950/40 border border-red-900/40 rounded-lg text-sm text-red-400">{msg}</div>; }

/* ── Helpers ── */
function getImageDims(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
