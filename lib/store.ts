import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Project, Screen, Connection, ConnectionAction, TransitionType, ScreenFilter } from "./types";
import { parseFigmaFile, extractFileKey } from "./figma-parser";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

interface AppState {
  figmaToken: string;
  project: Project | null;
  loading: boolean;
  loadingImages: boolean;
  error: string | null;

  search: string;
  filter: ScreenFilter;
  selectedScreenId: string | null;
  connectingHotspotId: string | null;

  playerActive: boolean;
  playerScreenId: string | null;
  playerHistory: string[];

  setToken: (t: string) => void;
  loadFile: (url: string) => Promise<void>;
  fetchImages: () => Promise<void>;
  disconnect: () => void;

  setSearch: (q: string) => void;
  setFilter: (f: ScreenFilter) => void;
  selectScreen: (id: string | null) => void;
  setStartScreen: (id: string) => void;

  startConnect: (hotspotId: string) => void;
  cancelConnect: () => void;
  connectTo: (targetId: string, action: ConnectionAction, transition: TransitionType) => void;
  removeConnection: (id: string) => void;

  startPlayer: () => void;
  stopPlayer: () => void;
  playerNav: (id: string) => void;
  playerBack: () => void;
}

export const useStore = create<AppState>()(
  immer((set, get) => ({
    figmaToken: "", project: null, loading: false, loadingImages: false, error: null,
    search: "", filter: "all", selectedScreenId: null, connectingHotspotId: null,
    playerActive: false, playerScreenId: null, playerHistory: [],

    setToken: (t) => set((s) => { s.figmaToken = t; }),

    loadFile: async (url) => {
      const { figmaToken } = get();
      const fileKey = extractFileKey(url);
      if (!figmaToken || !fileKey) { set((s) => { s.error = "Token and valid Figma URL required"; }); return; }
      set((s) => { s.loading = true; s.error = null; });

      try {
        const res = await fetch("/api/figma", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: figmaToken, fileKey }),
        });
        if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `Failed (${res.status})`); }

        const fileData = await res.json();
        const parsed = parseFigmaFile(fileKey, fileData);

        const screens: Screen[] = parsed.screens.map((sc, i) => ({
          id: uid(), name: sc.name, category: sc.pageName,
          subcategory: sc.sectionName, figmaNodeId: sc.figmaNodeId,
          imageUrl: null, imageWidth: sc.absoluteBounds.width, imageHeight: sc.absoluteBounds.height,
          hotspots: sc.hotspots.map((h) => ({
            id: uid(), screenId: "", figmaNodeId: h.figmaNodeId,
            label: h.label, elementType: h.elementType, rawName: h.rawName,
            bounds: h.normalizedBounds,
          })),
          order: i, isStartScreen: i === 0,
        }));
        for (const screen of screens) for (const h of screen.hotspots) h.screenId = screen.id;

        set((s) => {
          s.project = {
            id: uid(), name: parsed.fileName, figmaFileKey: fileKey,
            figmaFileName: parsed.fileName, screens, connections: [],
            createdAt: now(), updatedAt: now(),
          };
          s.loading = false;
        });
        get().fetchImages();
      } catch (e: any) { set((s) => { s.loading = false; s.error = e.message; }); }
    },

    fetchImages: async () => {
      const { project, figmaToken } = get();
      if (!project || !figmaToken) return;
      set((s) => { s.loadingImages = true; });

      try {
        const nodeIds = project.screens.map((s) => s.figmaNodeId).filter(Boolean) as string[];
        const batch = 50;
        const all: Record<string, string> = {};
        for (let i = 0; i < nodeIds.length; i += batch) {
          const res = await fetch("/api/figma/images", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: figmaToken, fileKey: project.figmaFileKey, nodeIds: nodeIds.slice(i, i + batch) }),
          });
          if (res.ok) Object.assign(all, (await res.json()).images || {});
        }
        set((s) => {
          if (!s.project) return;
          for (const sc of s.project.screens) {
            if (sc.figmaNodeId && all[sc.figmaNodeId]) sc.imageUrl = all[sc.figmaNodeId];
          }
          s.loadingImages = false;
        });
      } catch { set((s) => { s.loadingImages = false; }); }
    },

    disconnect: () => set((s) => {
      s.figmaToken = ""; s.project = null; s.selectedScreenId = null; s.error = null;
    }),

    setSearch: (q) => set((s) => { s.search = q; }),
    setFilter: (f) => set((s) => { s.filter = f; }),
    selectScreen: (id) => set((s) => { s.selectedScreenId = id; }),
    setStartScreen: (id) => set((s) => {
      if (!s.project) return;
      for (const sc of s.project.screens) sc.isStartScreen = sc.id === id;
    }),

    startConnect: (hid) => set((s) => { s.connectingHotspotId = hid; }),
    cancelConnect: () => set((s) => { s.connectingHotspotId = null; }),
    connectTo: (targetId, action, transition) => {
      const { connectingHotspotId: hid, project } = get();
      if (!hid || !project) return;
      let srcScreenId = "";
      for (const sc of project.screens) { if (sc.hotspots.some((h) => h.id === hid)) { srcScreenId = sc.id; break; } }
      if (!srcScreenId) return;
      const cid = uid();
      set((s) => {
        if (!s.project) return;
        s.project.connections = s.project.connections.filter((c) => c.sourceHotspotId !== hid);
        s.project.connections.push({ id: cid, sourceHotspotId: hid, sourceScreenId: srcScreenId, targetScreenId: targetId, action, transition });
        for (const sc of s.project.screens) { const h = sc.hotspots.find((h) => h.id === hid); if (h) h.connectionId = cid; }
        s.connectingHotspotId = null;
      });
    },
    removeConnection: (id) => set((s) => {
      if (!s.project) return;
      for (const sc of s.project.screens) for (const h of sc.hotspots) if (h.connectionId === id) h.connectionId = undefined;
      s.project.connections = s.project.connections.filter((c) => c.id !== id);
    }),

    startPlayer: () => set((s) => {
      if (!s.project) return;
      const start = s.project.screens.find((sc) => sc.isStartScreen) || s.project.screens[0];
      if (start) { s.playerScreenId = start.id; s.playerHistory = []; s.playerActive = true; }
    }),
    stopPlayer: () => set((s) => { s.playerActive = false; s.playerScreenId = null; s.playerHistory = []; }),
    playerNav: (id) => set((s) => { if (s.playerScreenId) s.playerHistory.push(s.playerScreenId); s.playerScreenId = id; }),
    playerBack: () => set((s) => { const p = s.playerHistory.pop(); if (p) s.playerScreenId = p; }),
  }))
);
