import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Project, Screen, Connection, ConnectionAction, TransitionType, ScreenFilter, Hotspot } from "./types";
import { parseFigmaFile, extractFileKey } from "./figma-parser";
import { createClient } from "./supabase/client";
import type { User } from "@supabase/supabase-js";

const uid = () => crypto.randomUUID();

interface AppState {
  user: User | null;
  projects: { id: string; name: string; figma_file_name: string; updated_at: string }[];
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

  // Auth
  setUser: (u: User | null) => void;
  signOut: () => Promise<void>;

  // Projects
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Figma
  loadFigmaFile: (url: string, figmaToken: string) => Promise<void>;
  saveFigmaToken: (token: string) => Promise<void>;
  getFigmaToken: () => Promise<string | null>;
  fetchImages: (figmaToken: string) => Promise<void>;

  // UI
  setSearch: (q: string) => void;
  setFilter: (f: ScreenFilter) => void;
  selectScreen: (id: string | null) => void;
  setStartScreen: (id: string) => void;
  goBack: () => void;

  // Connections
  startConnect: (hotspotId: string) => void;
  cancelConnect: () => void;
  connectTo: (targetId: string, action: ConnectionAction, transition: TransitionType) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;

  // Player
  startPlayer: () => void;
  stopPlayer: () => void;
  playerNav: (id: string) => void;
  playerBack: () => void;
}

export const useStore = create<AppState>()(
  immer((set, get) => ({
    user: null, projects: [], project: null, loading: false, loadingImages: false, error: null,
    search: "", filter: "all", selectedScreenId: null, connectingHotspotId: null,
    playerActive: false, playerScreenId: null, playerHistory: [],

    setUser: (u) => set((s) => { s.user = u; }),

    signOut: async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      set((s) => { s.user = null; s.projects = []; s.project = null; });
    },

    loadProjects: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("projects").select("id, name, figma_file_name, updated_at").order("updated_at", { ascending: false });
      set((s) => { s.projects = data || []; });
    },

    loadProject: async (id) => {
      set((s) => { s.loading = true; });
      const supabase = createClient();

      const { data: proj } = await supabase.from("projects").select("*").eq("id", id).single();
      if (!proj) { set((s) => { s.loading = false; s.error = "Project not found"; }); return; }

      const { data: screens } = await supabase.from("screens").select("*").eq("project_id", id).order("order");
      const screenIds = (screens || []).map((s: any) => s.id);

      let hotspots: any[] = [];
      let connections: any[] = [];
      if (screenIds.length > 0) {
        const { data: h } = await supabase.from("hotspots").select("*").in("screen_id", screenIds);
        hotspots = h || [];
        const { data: c } = await supabase.from("connections").select("*").eq("project_id", id);
        connections = c || [];
      }

      const project: Project = {
        id: proj.id, name: proj.name,
        figmaFileKey: proj.figma_file_key || "", figmaFileName: proj.figma_file_name || "",
        createdAt: proj.created_at, updatedAt: proj.updated_at,
        screens: (screens || []).map((sc: any) => {
          const scHotspots = hotspots.filter((h: any) => h.screen_id === sc.id);
          const scConns = connections.filter((c: any) => c.source_screen_id === sc.id);
          return {
            id: sc.id, name: sc.name, category: sc.category || "Uncategorized",
            subcategory: sc.subcategory, figmaNodeId: sc.figma_node_id,
            imageUrl: sc.cached_image_path
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${sc.cached_image_path}`
              : sc.image_url,
            imageWidth: sc.image_width || 0, imageHeight: sc.image_height || 0,
            hotspots: scHotspots.map((h: any) => ({
              id: h.id, screenId: sc.id, figmaNodeId: h.figma_node_id,
              label: h.label, elementType: h.element_type, rawName: h.raw_name,
              bounds: { x: h.bounds_x, y: h.bounds_y, w: h.bounds_w, h: h.bounds_h },
              connectionId: scConns.find((c: any) => c.source_hotspot_id === h.id)?.id,
            })),
            order: sc.order, isStartScreen: sc.is_start_screen,
          } as Screen;
        }),
        connections: connections.map((c: any) => ({
          id: c.id, sourceHotspotId: c.source_hotspot_id, sourceScreenId: c.source_screen_id,
          targetScreenId: c.target_screen_id, targetUrl: c.target_url,
          action: c.action || "navigate", transition: c.transition || "push",
        })),
      };

      set((s) => { s.project = project; s.loading = false; s.selectedScreenId = null; });
    },

    deleteProject: async (id) => {
      const supabase = createClient();
      await supabase.from("projects").delete().eq("id", id);
      set((s) => { s.projects = s.projects.filter((p) => p.id !== id); if (s.project?.id === id) s.project = null; });
    },

    saveFigmaToken: async (token) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ figma_token_encrypted: token }).eq("id", user.id);
      }
    },

    getFigmaToken: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("figma_token_encrypted").eq("id", user.id).single();
      return data?.figma_token_encrypted || null;
    },

    loadFigmaFile: async (url, figmaToken) => {
      const fileKey = extractFileKey(url);
      if (!figmaToken || !fileKey) { set((s) => { s.error = "Token and valid Figma URL required"; }); return; }
      set((s) => { s.loading = true; s.error = null; });

      try {
        // Fetch from Figma
        const res = await fetch("/api/figma", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: figmaToken, fileKey }),
        });
        if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `Failed (${res.status})`); }
        const fileData = await res.json();
        const parsed = parseFigmaFile(fileKey, fileData);

        // Save to Supabase
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Create project
        const { data: proj, error: projErr } = await supabase.from("projects")
          .insert({ owner_id: user.id, name: parsed.fileName, figma_file_key: fileKey, figma_file_name: parsed.fileName })
          .select().single();
        if (projErr || !proj) throw new Error(projErr?.message || "Failed to create project");

        // Create screens + hotspots
        for (let i = 0; i < parsed.screens.length; i++) {
          const sc = parsed.screens[i];
          const { data: dbScreen } = await supabase.from("screens")
            .insert({
              project_id: proj.id, name: sc.name, category: sc.pageName,
              subcategory: sc.sectionName, figma_node_id: sc.figmaNodeId,
              image_width: Math.round(sc.absoluteBounds.width), image_height: Math.round(sc.absoluteBounds.height),
              order: i, is_start_screen: i === 0,
            }).select().single();

          if (dbScreen && sc.hotspots.length > 0) {
            await supabase.from("hotspots").insert(
              sc.hotspots.map((h) => ({
                screen_id: dbScreen.id, figma_node_id: h.figmaNodeId,
                label: h.label, element_type: h.elementType, raw_name: h.rawName,
                bounds_x: h.normalizedBounds.x, bounds_y: h.normalizedBounds.y,
                bounds_w: h.normalizedBounds.w, bounds_h: h.normalizedBounds.h,
              }))
            );
          }
        }

        // Save Figma token to profile
        await get().saveFigmaToken(figmaToken);

        // Load the project we just created
        set((s) => { s.loading = false; });
        await get().loadProject(proj.id);
        await get().loadProjects();

        // Fetch images
        get().fetchImages(figmaToken);
      } catch (e: any) { set((s) => { s.loading = false; s.error = e.message; }); }
    },

    fetchImages: async (figmaToken) => {
      const { project } = get();
      if (!project || !figmaToken) return;
      set((s) => { s.loadingImages = true; });

      try {
        const nodeIds = project.screens.map((s) => s.figmaNodeId).filter(Boolean) as string[];
        if (nodeIds.length === 0) { set((s) => { s.loadingImages = false; }); return; }

        const batch = 50;
        const all: Record<string, string> = {};
        for (let i = 0; i < nodeIds.length; i += batch) {
          const res = await fetch("/api/figma/images", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: figmaToken, fileKey: project.figmaFileKey, nodeIds: nodeIds.slice(i, i + batch) }),
          });
          if (res.ok) Object.assign(all, (await res.json()).images || {});
        }

        // Update screens in store + DB, cache to Storage
        const supabase = createClient();
        for (const sc of project.screens) {
          if (sc.figmaNodeId && all[sc.figmaNodeId]) {
            const figmaUrl = all[sc.figmaNodeId];

            // Try caching to Supabase Storage
            try {
              const imgRes = await fetch(figmaUrl);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                const path = `${project.id}/${sc.id}.png`;
                await supabase.storage.from("screenshots").upload(path, blob, { upsert: true, contentType: "image/png" });
                const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${path}`;
                await supabase.from("screens").update({ image_url: figmaUrl, cached_image_path: path }).eq("id", sc.id);
                set((s) => { const screen = s.project?.screens.find((x) => x.id === sc.id); if (screen) screen.imageUrl = publicUrl; });
                continue;
              }
            } catch { /* fallback to temp URL */ }

            // Fallback: just store Figma URL
            await supabase.from("screens").update({ image_url: figmaUrl }).eq("id", sc.id);
            set((s) => { const screen = s.project?.screens.find((x) => x.id === sc.id); if (screen) screen.imageUrl = figmaUrl; });
          }
        }
        set((s) => { s.loadingImages = false; });
      } catch { set((s) => { s.loadingImages = false; }); }
    },

    setSearch: (q) => set((s) => { s.search = q; }),
    setFilter: (f) => set((s) => { s.filter = f; }),
    selectScreen: (id) => set((s) => { s.selectedScreenId = id; }),
    setStartScreen: (id) => set((s) => {
      if (!s.project) return;
      for (const sc of s.project.screens) sc.isStartScreen = sc.id === id;
      // Also update DB
      const supabase = createClient();
      s.project.screens.forEach((sc) => { supabase.from("screens").update({ is_start_screen: sc.id === id }).eq("id", sc.id); });
    }),
    goBack: () => set((s) => { s.project = null; s.selectedScreenId = null; }),

    startConnect: (hid) => set((s) => { s.connectingHotspotId = hid; }),
    cancelConnect: () => set((s) => { s.connectingHotspotId = null; }),

    connectTo: async (targetId, action, transition) => {
      const { connectingHotspotId: hid, project } = get();
      if (!hid || !project) return;
      let srcScreenId = "";
      for (const sc of project.screens) { if (sc.hotspots.some((h) => h.id === hid)) { srcScreenId = sc.id; break; } }
      if (!srcScreenId) return;

      const supabase = createClient();
      // Remove existing
      await supabase.from("connections").delete().eq("source_hotspot_id", hid);

      const { data: conn } = await supabase.from("connections")
        .insert({ project_id: project.id, source_hotspot_id: hid, source_screen_id: srcScreenId, target_screen_id: targetId, action, transition })
        .select().single();

      if (conn) {
        set((s) => {
          if (!s.project) return;
          s.project.connections = s.project.connections.filter((c) => c.sourceHotspotId !== hid);
          s.project.connections.push({
            id: conn.id, sourceHotspotId: hid, sourceScreenId: srcScreenId,
            targetScreenId: targetId, action, transition,
          });
          for (const sc of s.project.screens) { const h = sc.hotspots.find((h) => h.id === hid); if (h) h.connectionId = conn.id; }
          s.connectingHotspotId = null;
        });
      }
    },

    removeConnection: async (id) => {
      const supabase = createClient();
      await supabase.from("connections").delete().eq("id", id);
      set((s) => {
        if (!s.project) return;
        for (const sc of s.project.screens) for (const h of sc.hotspots) if (h.connectionId === id) h.connectionId = undefined;
        s.project.connections = s.project.connections.filter((c) => c.id !== id);
      });
    },

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
