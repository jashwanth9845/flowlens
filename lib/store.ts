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
  imageProgress: { done: number; total: number };
  error: string | null;
  search: string;
  filter: ScreenFilter;
  selectedScreenId: string | null;
  connectingHotspotId: string | null;
  playerActive: boolean;
  playerScreenId: string | null;
  playerHistory: string[];

  setUser: (u: User | null) => void;
  signOut: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loadFigmaFile: (url: string, figmaToken: string) => Promise<void>;
  saveFigmaToken: (token: string) => Promise<void>;
  getFigmaToken: () => Promise<string | null>;
  fetchImages: (figmaToken: string) => Promise<void>;
  setSearch: (q: string) => void;
  setFilter: (f: ScreenFilter) => void;
  selectScreen: (id: string | null) => void;
  setStartScreen: (id: string) => void;
  goBack: () => void;
  startConnect: (hotspotId: string) => void;
  cancelConnect: () => void;
  connectTo: (targetId: string, action: ConnectionAction, transition: TransitionType) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  startPlayer: () => void;
  stopPlayer: () => void;
  playerNav: (id: string) => void;
  playerBack: () => void;
}

export const useStore = create<AppState>()(
  immer((set, get) => ({
    user: null, projects: [], project: null, loading: false,
    loadingImages: false, imageProgress: { done: 0, total: 0 },
    error: null, search: "", filter: "all", selectedScreenId: null,
    connectingHotspotId: null, playerActive: false, playerScreenId: null, playerHistory: [],

    setUser: (u) => set((s) => { s.user = u; }),
    signOut: async () => {
      const sb = createClient(); await sb.auth.signOut();
      set((s) => { s.user = null; s.projects = []; s.project = null; });
    },

    loadProjects: async () => {
      const sb = createClient();
      const { data } = await sb.from("projects").select("id, name, figma_file_name, updated_at").order("updated_at", { ascending: false });
      set((s) => { s.projects = data || []; });
    },

    loadProject: async (id) => {
      set((s) => { s.loading = true; });
      const sb = createClient();
      const { data: proj } = await sb.from("projects").select("*").eq("id", id).single();
      if (!proj) { set((s) => { s.loading = false; s.error = "Project not found"; }); return; }

      const { data: screens } = await sb.from("screens").select("*").eq("project_id", id).order("order");
      const sids = (screens || []).map((s: any) => s.id);
      let hotspots: any[] = [], connections: any[] = [];
      if (sids.length > 0) {
        const { data: h } = await sb.from("hotspots").select("*").in("screen_id", sids);
        hotspots = h || [];
        const { data: c } = await sb.from("connections").select("*").eq("project_id", id);
        connections = c || [];
      }

      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const project: Project = {
        id: proj.id, name: proj.name,
        figmaFileKey: proj.figma_file_key || "", figmaFileName: proj.figma_file_name || "",
        createdAt: proj.created_at, updatedAt: proj.updated_at,
        screens: (screens || []).map((sc: any) => {
          const scH = hotspots.filter((h: any) => h.screen_id === sc.id);
          const scC = connections.filter((c: any) => c.source_screen_id === sc.id);
          // Prefer cached Storage URL, fall back to Figma temp URL
          let imageUrl = sc.image_url || null;
          if (sc.cached_image_path && supaUrl) {
            imageUrl = `${supaUrl}/storage/v1/object/public/screenshots/${sc.cached_image_path}`;
          }
          return {
            id: sc.id, name: sc.name, category: sc.category || "Uncategorized",
            subcategory: sc.subcategory, figmaNodeId: sc.figma_node_id,
            imageUrl, imageWidth: sc.image_width || 0, imageHeight: sc.image_height || 0,
            hotspots: scH.map((h: any) => ({
              id: h.id, screenId: sc.id, figmaNodeId: h.figma_node_id,
              label: h.label, elementType: h.element_type, rawName: h.raw_name,
              bounds: { x: h.bounds_x, y: h.bounds_y, w: h.bounds_w, h: h.bounds_h },
              connectionId: scC.find((c: any) => c.source_hotspot_id === h.id)?.id,
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

      // Auto-fetch images if this is a Figma project with missing screenshots
      const missingImages = project.screens.some((s) => s.figmaNodeId && !s.imageUrl);
      if (missingImages && project.figmaFileKey) {
        const token = await get().getFigmaToken();
        if (token) get().fetchImages(token);
      }
    },

    deleteProject: async (id) => {
      const sb = createClient();
      await sb.from("projects").delete().eq("id", id);
      set((s) => { s.projects = s.projects.filter((p) => p.id !== id); if (s.project?.id === id) s.project = null; });
    },

    saveFigmaToken: async (token) => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) await sb.from("profiles").update({ figma_token_encrypted: token }).eq("id", user.id);
    },

    getFigmaToken: async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const { data } = await sb.from("profiles").select("figma_token_encrypted").eq("id", user.id).single();
      return data?.figma_token_encrypted || null;
    },

    loadFigmaFile: async (url, figmaToken) => {
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

        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: proj, error: pErr } = await sb.from("projects")
          .insert({ owner_id: user.id, name: parsed.fileName, figma_file_key: fileKey, figma_file_name: parsed.fileName })
          .select().single();
        if (pErr || !proj) throw new Error(pErr?.message || "Failed to create project");

        for (let i = 0; i < parsed.screens.length; i++) {
          const sc = parsed.screens[i];
          const { data: dbSc } = await sb.from("screens").insert({
            project_id: proj.id, name: sc.name, category: sc.pageName,
            subcategory: sc.sectionName, figma_node_id: sc.figmaNodeId,
            image_width: Math.round(sc.absoluteBounds.width), image_height: Math.round(sc.absoluteBounds.height),
            order: i, is_start_screen: i === 0,
          }).select().single();

          if (dbSc && sc.hotspots.length > 0) {
            await sb.from("hotspots").insert(sc.hotspots.map((h) => ({
              screen_id: dbSc.id, figma_node_id: h.figmaNodeId,
              label: h.label, element_type: h.elementType, raw_name: h.rawName,
              bounds_x: h.normalizedBounds.x, bounds_y: h.normalizedBounds.y,
              bounds_w: h.normalizedBounds.w, bounds_h: h.normalizedBounds.h,
            })));
          }
        }

        await get().saveFigmaToken(figmaToken);
        set((s) => { s.loading = false; });
        await get().loadProject(proj.id);
        await get().loadProjects();
        get().fetchImages(figmaToken);
      } catch (e: any) { set((s) => { s.loading = false; s.error = e.message; }); }
    },

    fetchImages: async (figmaToken) => {
      const { project } = get();
      if (!project || !figmaToken) return;

      const screensNeedingImages = project.screens.filter((s) => s.figmaNodeId && !s.imageUrl);
      if (screensNeedingImages.length === 0) return;

      set((s) => { s.loadingImages = true; s.imageProgress = { done: 0, total: screensNeedingImages.length }; });

      try {
        // Step 1: Get all Figma image URLs in batches
        const nodeIds = screensNeedingImages.map((s) => s.figmaNodeId!);
        const allUrls: Record<string, string> = {};
        const batch = 50;
        for (let i = 0; i < nodeIds.length; i += batch) {
          const res = await fetch("/api/figma/images", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: figmaToken, fileKey: project.figmaFileKey, nodeIds: nodeIds.slice(i, i + batch) }),
          });
          if (res.ok) {
            const data = await res.json();
            Object.assign(allUrls, data.images || {});
          }
        }

        // Step 2: Immediately set Figma temp URLs so images show NOW
        const sb = createClient();
        for (const sc of screensNeedingImages) {
          const tempUrl = allUrls[sc.figmaNodeId!];
          if (tempUrl) {
            // Save temp URL to DB so it persists on reload
            await sb.from("screens").update({ image_url: tempUrl }).eq("id", sc.id);
            set((s) => {
              const screen = s.project?.screens.find((x) => x.id === sc.id);
              if (screen) screen.imageUrl = tempUrl;
            });
          }
        }

        // Step 3: Cache to Supabase Storage via server route (one at a time, with progress)
        let done = 0;
        for (const sc of screensNeedingImages) {
          const tempUrl = allUrls[sc.figmaNodeId!];
          if (!tempUrl) { done++; set((s) => { s.imageProgress.done = done; }); continue; }

          try {
            const cacheRes = await fetch("/api/figma/cache", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: tempUrl,
                storagePath: `${project.id}/${sc.id}.png`,
                screenId: sc.id,
              }),
            });
            if (cacheRes.ok) {
              const { publicUrl } = await cacheRes.json();
              set((s) => {
                const screen = s.project?.screens.find((x) => x.id === sc.id);
                if (screen) screen.imageUrl = publicUrl;
              });
            }
          } catch { /* temp URL still works as fallback */ }

          done++;
          set((s) => { s.imageProgress.done = done; });
        }

        set((s) => { s.loadingImages = false; });
      } catch {
        set((s) => { s.loadingImages = false; });
      }
    },

    setSearch: (q) => set((s) => { s.search = q; }),
    setFilter: (f) => set((s) => { s.filter = f; }),
    selectScreen: (id) => set((s) => { s.selectedScreenId = id; }),
    setStartScreen: (id) => set((s) => {
      if (!s.project) return;
      for (const sc of s.project.screens) sc.isStartScreen = sc.id === id;
      const sb = createClient();
      s.project.screens.forEach((sc) => { sb.from("screens").update({ is_start_screen: sc.id === id }).eq("id", sc.id); });
    }),
    goBack: () => set((s) => { s.project = null; s.selectedScreenId = null; }),

    startConnect: (hid) => set((s) => { s.connectingHotspotId = hid; }),
    cancelConnect: () => set((s) => { s.connectingHotspotId = null; }),
    connectTo: async (targetId, action, transition) => {
      const { connectingHotspotId: hid, project } = get();
      if (!hid || !project) return;
      let srcId = "";
      for (const sc of project.screens) { if (sc.hotspots.some((h) => h.id === hid)) { srcId = sc.id; break; } }
      if (!srcId) return;
      const sb = createClient();
      await sb.from("connections").delete().eq("source_hotspot_id", hid);
      const { data: conn } = await sb.from("connections")
        .insert({ project_id: project.id, source_hotspot_id: hid, source_screen_id: srcId, target_screen_id: targetId, action, transition })
        .select().single();
      if (conn) {
        set((s) => {
          if (!s.project) return;
          s.project.connections = s.project.connections.filter((c) => c.sourceHotspotId !== hid);
          s.project.connections.push({ id: conn.id, sourceHotspotId: hid, sourceScreenId: srcId, targetScreenId: targetId, action, transition });
          for (const sc of s.project.screens) { const h = sc.hotspots.find((h) => h.id === hid); if (h) h.connectionId = conn.id; }
          s.connectingHotspotId = null;
        });
      }
    },
    removeConnection: async (id) => {
      const sb = createClient(); await sb.from("connections").delete().eq("id", id);
      set((s) => {
        if (!s.project) return;
        for (const sc of s.project.screens) for (const h of sc.hotspots) if (h.connectionId === id) h.connectionId = undefined;
        s.project.connections = s.project.connections.filter((c) => c.id !== id);
      });
    },

    startPlayer: () => set((s) => {
      if (!s.project) return;
      const st = s.project.screens.find((sc) => sc.isStartScreen) || s.project.screens[0];
      if (st) { s.playerScreenId = st.id; s.playerHistory = []; s.playerActive = true; }
    }),
    stopPlayer: () => set((s) => { s.playerActive = false; s.playerScreenId = null; s.playerHistory = []; }),
    playerNav: (id) => set((s) => { if (s.playerScreenId) s.playerHistory.push(s.playerScreenId); s.playerScreenId = id; }),
    playerBack: () => set((s) => { const p = s.playerHistory.pop(); if (p) s.playerScreenId = p; }),
  }))
);
