import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Project, Screen, Connection, ActionType, TransitionType } from "./types";
import { parseFigmaFile, extractFileKey } from "./figma-parser";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

interface FlowLensState {
  // Settings (persisted to localStorage)
  figmaToken: string;
  figmaConnected: boolean;

  // Current project
  project: Project | null;
  loading: boolean;
  loadingImages: boolean;
  error: string | null;

  // UI
  selectedScreenId: string | null;
  selectedHotspotId: string | null;
  searchQuery: string;
  categoryFilter: string | null;
  view: "grid" | "flow" | "player";
  connectingHotspotId: string | null;
  playerScreenId: string | null;
  playerHistory: string[];

  // Actions
  setFigmaToken: (token: string) => void;
  loadFigmaFile: (fileUrl: string) => Promise<void>;
  fetchFrameImages: () => Promise<void>;
  disconnect: () => void;

  setSearch: (q: string) => void;
  setCategoryFilter: (c: string | null) => void;
  setView: (v: "grid" | "flow" | "player") => void;
  selectScreen: (id: string | null) => void;
  setStartScreen: (id: string) => void;

  startConnecting: (hotspotId: string) => void;
  cancelConnecting: () => void;
  connectTo: (targetScreenId: string, action: ActionType, transition: TransitionType) => void;
  removeConnection: (id: string) => void;

  playerNavigate: (screenId: string) => void;
  playerGoBack: () => void;
  startPlayer: () => void;
  stopPlayer: () => void;

  exportJSON: () => string;
}

export const useStore = create<FlowLensState>()(
  immer((set, get) => ({
    figmaToken: "",
    figmaConnected: false,
    project: null,
    loading: false,
    loadingImages: false,
    error: null,
    selectedScreenId: null,
    selectedHotspotId: null,
    searchQuery: "",
    categoryFilter: null,
    view: "grid",
    connectingHotspotId: null,
    playerScreenId: null,
    playerHistory: [],

    setFigmaToken: (token) => set((s) => {
      s.figmaToken = token;
      if (typeof window !== "undefined") localStorage.setItem("fl_token", token);
    }),

    loadFigmaFile: async (fileUrl: string) => {
      const { figmaToken } = get();
      const fileKey = extractFileKey(fileUrl);
      if (!figmaToken || !fileKey) {
        set((s) => { s.error = "Token and valid Figma URL required"; });
        return;
      }

      set((s) => { s.loading = true; s.error = null; });

      try {
        const res = await fetch("/api/figma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: figmaToken, fileKey }),
        });

        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || `Failed (${res.status})`);
        }

        const fileData = await res.json();
        const parsed = parseFigmaFile(fileData);

        const screens: Screen[] = parsed.allFrames.map((frame, i) => ({
          id: uid(),
          figmaFrameId: frame.figmaNodeId,
          name: frame.name,
          imageUrl: null,
          frameDimensions: { w: frame.absoluteBounds.width, h: frame.absoluteBounds.height },
          hotspots: frame.hotspots.map((h) => ({
            id: uid(),
            screenId: "",
            figmaNodeId: h.figmaNodeId,
            label: h.label,
            elementType: h.elementType,
            rawName: h.rawName,
            bounds: h.normalizedBounds,
          })),
          position: { x: (i % 4) * 340, y: Math.floor(i / 4) * 500 },
          order: i,
          isStartScreen: i === 0,
          category: frame.pageName || "Uncategorized",
        }));

        for (const screen of screens) {
          for (const h of screen.hotspots) h.screenId = screen.id;
        }

        set((s) => {
          s.project = {
            id: uid(),
            name: parsed.fileName,
            figmaFileKey: fileKey,
            figmaFileName: parsed.fileName,
            screens,
            connections: [],
            createdAt: now(),
            updatedAt: now(),
          };
          s.figmaConnected = true;
          s.loading = false;
        });

        // Auto-fetch images
        get().fetchFrameImages();
      } catch (e: any) {
        set((s) => { s.loading = false; s.error = e.message; });
      }
    },

    fetchFrameImages: async () => {
      const { project, figmaToken } = get();
      if (!project || !figmaToken) return;

      set((s) => { s.loadingImages = true; });

      try {
        const nodeIds = project.screens.map((s) => s.figmaFrameId);

        // Figma limits to ~100 IDs per request, batch if needed
        const batchSize = 50;
        const allImages: Record<string, string> = {};

        for (let i = 0; i < nodeIds.length; i += batchSize) {
          const batch = nodeIds.slice(i, i + batchSize);
          const res = await fetch("/api/figma/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: figmaToken,
              fileKey: project.figmaFileKey,
              nodeIds: batch,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            Object.assign(allImages, data.images || {});
          }
        }

        set((s) => {
          if (!s.project) return;
          for (const screen of s.project.screens) {
            const url = allImages[screen.figmaFrameId];
            if (url) screen.imageUrl = url;
          }
          s.loadingImages = false;
        });
      } catch {
        set((s) => { s.loadingImages = false; });
      }
    },

    disconnect: () => set((s) => {
      s.figmaToken = "";
      s.figmaConnected = false;
      s.project = null;
      s.selectedScreenId = null;
      s.error = null;
      if (typeof window !== "undefined") localStorage.removeItem("fl_token");
    }),

    setSearch: (q) => set((s) => { s.searchQuery = q; }),
    setCategoryFilter: (c) => set((s) => { s.categoryFilter = c; }),
    setView: (v) => set((s) => { s.view = v; }),
    selectScreen: (id) => set((s) => { s.selectedScreenId = id; s.selectedHotspotId = null; }),

    setStartScreen: (id) => set((s) => {
      if (!s.project) return;
      for (const sc of s.project.screens) sc.isStartScreen = sc.id === id;
    }),

    startConnecting: (hotspotId) => set((s) => { s.connectingHotspotId = hotspotId; }),
    cancelConnecting: () => set((s) => { s.connectingHotspotId = null; }),

    connectTo: (targetScreenId, action, transition) => {
      const { connectingHotspotId, project } = get();
      if (!connectingHotspotId || !project) return;

      // Find source screen
      let sourceScreenId = "";
      for (const sc of project.screens) {
        if (sc.hotspots.some((h) => h.id === connectingHotspotId)) {
          sourceScreenId = sc.id;
          break;
        }
      }
      if (!sourceScreenId) return;

      const id = uid();
      set((s) => {
        if (!s.project) return;
        s.project.connections = s.project.connections.filter(
          (c) => c.sourceHotspotId !== connectingHotspotId
        );
        s.project.connections.push({
          id, sourceHotspotId: connectingHotspotId!, sourceScreenId,
          targetScreenId, action, transition,
        });
        for (const sc of s.project.screens) {
          const h = sc.hotspots.find((h) => h.id === connectingHotspotId);
          if (h) h.connectionId = id;
        }
        s.connectingHotspotId = null;
        s.project.updatedAt = now();
      });
    },

    removeConnection: (id) => set((s) => {
      if (!s.project) return;
      for (const sc of s.project.screens) {
        for (const h of sc.hotspots) {
          if (h.connectionId === id) h.connectionId = undefined;
        }
      }
      s.project.connections = s.project.connections.filter((c) => c.id !== id);
    }),

    startPlayer: () => set((s) => {
      if (!s.project) return;
      const start = s.project.screens.find((sc) => sc.isStartScreen) || s.project.screens[0];
      if (start) {
        s.playerScreenId = start.id;
        s.playerHistory = [];
        s.view = "player";
      }
    }),
    stopPlayer: () => set((s) => { s.view = "grid"; s.playerScreenId = null; s.playerHistory = []; }),
    playerNavigate: (screenId) => set((s) => {
      if (s.playerScreenId) s.playerHistory.push(s.playerScreenId);
      s.playerScreenId = screenId;
    }),
    playerGoBack: () => set((s) => {
      const prev = s.playerHistory.pop();
      if (prev) s.playerScreenId = prev;
    }),

    exportJSON: () => JSON.stringify(get().project, null, 2),
  }))
);
