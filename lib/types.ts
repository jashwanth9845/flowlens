export const ELEMENT_TYPES = [
  "button","icon-button","input","dropdown","toggle","checkbox",
  "radio","tab","link","nav-item","card","menu-item","fab","chip","custom",
] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

export const SCREEN_FILTERS = ["all","start","unlinked","dead-end","no-hotspots","has-image"] as const;
export type ScreenFilter = (typeof SCREEN_FILTERS)[number];

export type ConnectionAction = "navigate" | "back" | "open_overlay" | "open_url";
export type TransitionType = "push" | "fade" | "slide-left" | "slide-right" | "slide-up" | "none";

export interface NormalizedBounds { x: number; y: number; w: number; h: number }

export const ELEMENT_COLORS: Record<ElementType, string> = {
  button:"#3b82f6","icon-button":"#6366f1",input:"#f59e0b",dropdown:"#8b5cf6",
  toggle:"#10b981",checkbox:"#14b8a6",radio:"#06b6d4",tab:"#ec4899",
  link:"#0ea5e9","nav-item":"#64748b",card:"#f97316","menu-item":"#a855f7",
  fab:"#d946ef",chip:"#84cc16",custom:"#78716c",
};

export interface Hotspot {
  id: string; screenId: string; figmaNodeId?: string;
  label: string; elementType: ElementType; rawName: string;
  bounds: NormalizedBounds; connectionId?: string;
}

export interface Connection {
  id: string; sourceHotspotId: string; sourceScreenId: string;
  targetScreenId?: string; targetUrl?: string;
  action: ConnectionAction; transition: TransitionType;
}

export interface Screen {
  id: string; name: string; category: string; subcategory: string | null;
  figmaNodeId?: string; imageUrl: string | null;
  imageWidth: number; imageHeight: number;
  hotspots: Hotspot[]; order: number; isStartScreen: boolean;
}

export interface Project {
  id: string; name: string; figmaFileKey: string; figmaFileName: string;
  screens: Screen[]; connections: Connection[];
  createdAt: string; updatedAt: string;
}

export interface FigmaScreenCandidate {
  figmaNodeId: string; name: string; pageName: string; sectionName: string | null;
  absoluteBounds: { x: number; y: number; width: number; height: number };
  hotspots: { figmaNodeId: string; label: string; elementType: ElementType;
    rawName: string; normalizedBounds: NormalizedBounds; }[];
}

export interface FigmaParseResult {
  fileName: string; fileKey: string; lastModified?: string;
  screens: FigmaScreenCandidate[];
}
