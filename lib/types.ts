export const ELEMENT_TYPES = [
  "button", "icon-button", "input", "dropdown", "toggle",
  "checkbox", "radio", "tab", "link", "nav-item",
  "card", "menu-item", "fab", "chip", "custom",
] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

export type ActionType = "navigate" | "modal" | "back" | "external" | "swap" | "scroll";
export type TransitionType = "push" | "fade" | "slide-left" | "slide-right" | "slide-up" | "none";

export const ELEMENT_COLORS: Record<ElementType, string> = {
  button: "#3b82f6", "icon-button": "#6366f1", input: "#f59e0b",
  dropdown: "#8b5cf6", toggle: "#10b981", checkbox: "#14b8a6",
  radio: "#06b6d4", tab: "#ec4899", link: "#0ea5e9",
  "nav-item": "#64748b", card: "#f97316", "menu-item": "#a855f7",
  fab: "#d946ef", chip: "#84cc16", custom: "#78716c",
};

export interface NormalizedBounds { x: number; y: number; w: number; h: number }

export interface Hotspot {
  id: string;
  screenId: string;
  figmaNodeId: string;
  label: string;
  elementType: ElementType;
  rawName: string;
  bounds: NormalizedBounds;
  connectionId?: string;
}

export interface Connection {
  id: string;
  sourceHotspotId: string;
  sourceScreenId: string;
  targetScreenId: string;
  action: ActionType;
  transition: TransitionType;
}

export interface Screen {
  id: string;
  figmaFrameId: string;
  name: string;
  /** Rendered PNG URL from Figma Images API */
  imageUrl: string | null;
  frameDimensions: { w: number; h: number };
  hotspots: Hotspot[];
  position: { x: number; y: number };
  order: number;
  isStartScreen: boolean;
  /** Optional category/group (parsed from Figma page name) */
  category: string;
}

export interface Project {
  id: string;
  name: string;
  figmaFileKey: string;
  figmaFileName: string;
  screens: Screen[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}
