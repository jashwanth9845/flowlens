import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Project, Screen, Hotspot, Connection,
  ActionType, TransitionType, FigmaConnection,
} from "./types";
import { parseFigmaFile, extractFileKey, type ParseResult } from "./figma-parser";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ── Store ────────────────────────────────────────────────────────

interface FlowLensState {
  // Figma connection
  figma: FigmaConnection;
  parseResult: ParseResult | null;

  // Project
  project: Project | null;

  // UI
  selectedScreenId: string | null;
  selectedHotspotId: string | null;
  editorMode: "select" | "connect";
  playerActive: boolean;
  playerCurrentScreenId: string | null;
  playerHistory: string[];

  // ── Figma actions ────────────────────────────────────────────
  setFigmaToken: (token: string) => void;
  setFigmaFileUrl: (url: string) => void;
  connectFigma: () => Promise<void>;
  disconnect: () => void;

  // ── Screen actions ───────────────────────────────────────────
  uploadScreenImage: (screenId: string, imageDataUrl: string) => void;
  setStartScreen: (screenId: string) => void;
  updateScreenPosition: (screenId: string, pos: { x: number; y: number }) => void;

  // ── Connection actions ───────────────────────────────────────
  connectHotspot: (
    sourceScreenId: string,
    sourceHotspotId: string,
    targetScreenId: string,
    action: ActionType,
    transition: TransitionType,
  ) => void;
  removeConnection: (connectionId: string) => void;

  // ── Selection ────────────────────────────────────────────────
  selectScreen: (id: string | null) => void;
  selectHotspot: (id: string | null) => void;
  setEditorMode: (mode: "select" | "connect") => void;

  // ── Player ───────────────────────────────────────────────────
  startPlayer: () => void;
  stopPlayer: () => void;
  playerNavigate: (screenId: string) => void;
  playerGoBack: () => void;

  // ── Export ───────────────────────────────────────────────────
  exportProjectJSON: () => string;
}

export const useFlowLensStore = create<FlowLensState>()(
  immer((set, get) => ({
    figma: {
      token: "",
      fileUrl: "",
      fileKey: "",
      connected: false,
      loading: false,
      error: null,
    },
    parseResult: null,
    project: null,
    selectedScreenId: null,
    selectedHotspotId: null,
    editorMode: "select",
    playerActive: false,
    playerCurrentScreenId: null,
    playerHistory: [],

    // ── Figma ──────────────────────────────────────────────────

    setFigmaToken: (token) =>
      set((s) => { s.figma.token = token; }),

    setFigmaFileUrl: (url) =>
      set((s) => {
        s.figma.fileUrl = url;
        s.figma.fileKey = extractFileKey(url) || "";
      }),

    connectFigma: async () => {
      const { figma } = get();
      if (!figma.token || !figma.fileKey) {
        set((s) => { s.figma.error = "Token and file URL are required"; });
        return;
      }

      set((s) => {
        s.figma.loading = true;
        s.figma.error = null;
      });

      try {
        const res = await fetch("/api/figma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: figma.token,
            fileKey: figma.fileKey,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed (${res.status})`);
        }

        const fileData = await res.json();
        const parsed = parseFigmaFile(fileData);

        // Create project with screens from parsed frames
        const screens: Screen[] = parsed.allFrames.map((frame, i) => ({
          id: uid(),
          figmaFrameId: frame.figmaNodeId,
          name: frame.name,
          imageDataUrl: null,
          frameDimensions: {
            w: frame.absoluteBounds.width,
            h: frame.absoluteBounds.height,
          },
          hotspots: frame.hotspots.map((h) => ({
            id: uid(),
            screenId: "", // will be set below
            figmaNodeId: h.figmaNodeId,
            label: h.label,
            elementType: h.elementType,
            rawName: h.rawName,
            bounds: h.normalizedBounds,
          })),
          position: { x: (i % 4) * 340, y: Math.floor(i / 4) * 500 },
          order: i,
          isStartScreen: i === 0,
        }));

        // Set screenId on hotspots
        for (const screen of screens) {
          for (const h of screen.hotspots) {
            h.screenId = screen.id;
          }
        }

        set((s) => {
          s.figma.connected = true;
          s.figma.loading = false;
          s.parseResult = parsed;
          s.project = {
            id: uid(),
            name: parsed.fileName,
            figmaFileKey: figma.fileKey,
            figmaFileName: parsed.fileName,
            screens,
            connections: [],
            createdAt: now(),
            updatedAt: now(),
          };
        });
      } catch (err: any) {
        set((s) => {
          s.figma.loading = false;
          s.figma.error = err.message;
        });
      }
    },

    disconnect: () =>
      set((s) => {
        s.figma = {
          token: "", fileUrl: "", fileKey: "",
          connected: false, loading: false, error: null,
        };
        s.parseResult = null;
        s.project = null;
        s.selectedScreenId = null;
        s.selectedHotspotId = null;
      }),

    // ── Screens ────────────────────────────────────────────────

    uploadScreenImage: (screenId, imageDataUrl) =>
      set((s) => {
        const screen = s.project?.screens.find((sc) => sc.id === screenId);
        if (screen) screen.imageDataUrl = imageDataUrl;
        if (s.project) s.project.updatedAt = now();
      }),

    setStartScreen: (screenId) =>
      set((s) => {
        if (!s.project) return;
        for (const screen of s.project.screens) {
          screen.isStartScreen = screen.id === screenId;
        }
      }),

    updateScreenPosition: (screenId, pos) =>
      set((s) => {
        const screen = s.project?.screens.find((sc) => sc.id === screenId);
        if (screen) screen.position = pos;
      }),

    // ── Connections ────────────────────────────────────────────

    connectHotspot: (sourceScreenId, sourceHotspotId, targetScreenId, action, transition) => {
      const id = uid();
      set((s) => {
        if (!s.project) return;
        // Remove existing connection from this hotspot
        s.project.connections = s.project.connections.filter(
          (c) => c.sourceHotspotId !== sourceHotspotId
        );
        // Add new
        s.project.connections.push({
          id, sourceHotspotId, sourceScreenId, targetScreenId,
          action, transition,
        });
        // Link on hotspot
        const screen = s.project.screens.find((sc) => sc.id === sourceScreenId);
        const hotspot = screen?.hotspots.find((h) => h.id === sourceHotspotId);
        if (hotspot) hotspot.connectionId = id;
        s.project.updatedAt = now();
      });
    },

    removeConnection: (connectionId) =>
      set((s) => {
        if (!s.project) return;
        const conn = s.project.connections.find((c) => c.id === connectionId);
        if (conn) {
          for (const screen of s.project.screens) {
            for (const h of screen.hotspots) {
              if (h.connectionId === connectionId) h.connectionId = undefined;
            }
          }
        }
        s.project.connections = s.project.connections.filter(
          (c) => c.id !== connectionId
        );
        s.project.updatedAt = now();
      }),

    // ── Selection ──────────────────────────────────────────────

    selectScreen: (id) => set((s) => { s.selectedScreenId = id; s.selectedHotspotId = null; }),
    selectHotspot: (id) => set((s) => { s.selectedHotspotId = id; }),
    setEditorMode: (mode) => set((s) => { s.editorMode = mode; }),

    // ── Player ─────────────────────────────────────────────────

    startPlayer: () =>
      set((s) => {
        if (!s.project) return;
        const start = s.project.screens.find((sc) => sc.isStartScreen)
          || s.project.screens[0];
        if (start) {
          s.playerCurrentScreenId = start.id;
          s.playerHistory = [];
          s.playerActive = true;
        }
      }),

    stopPlayer: () =>
      set((s) => {
        s.playerActive = false;
        s.playerCurrentScreenId = null;
        s.playerHistory = [];
      }),

    playerNavigate: (screenId) =>
      set((s) => {
        if (s.playerCurrentScreenId) s.playerHistory.push(s.playerCurrentScreenId);
        s.playerCurrentScreenId = screenId;
      }),

    playerGoBack: () =>
      set((s) => {
        const prev = s.playerHistory.pop();
        if (prev) s.playerCurrentScreenId = prev;
      }),

    // ── Export ──────────────────────────────────────────────────

    exportProjectJSON: () => {
      const project = get().project;
      if (!project) return "{}";
      const exportable = {
        ...project,
        screens: project.screens.map((s) => ({ ...s, imageDataUrl: null })),
      };
      return JSON.stringify(exportable, null, 2);
    },
  }))
);
