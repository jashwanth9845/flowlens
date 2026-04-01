// ── Element Types ────────────────────────────────────────────────

export const ELEMENT_TYPES = [
  "button", "icon-button", "input", "dropdown", "toggle",
  "checkbox", "radio", "tab", "link", "nav-item",
  "card", "menu-item", "fab", "chip", "custom",
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export const ACTION_TYPES = [
  "navigate", "modal", "back", "external", "swap", "scroll",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const TRANSITION_TYPES = [
  "push", "fade", "slide-left", "slide-right", "slide-up", "none",
] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number];

// ── Colors for each element type ─────────────────────────────────

export const ELEMENT_COLORS: Record<ElementType, string> = {
  button: "#3b82f6",
  "icon-button": "#6366f1",
  input: "#f59e0b",
  dropdown: "#8b5cf6",
  toggle: "#10b981",
  checkbox: "#14b8a6",
  radio: "#06b6d4",
  tab: "#ec4899",
  link: "#0ea5e9",
  "nav-item": "#64748b",
  card: "#f97316",
  "menu-item": "#a855f7",
  fab: "#d946ef",
  chip: "#84cc16",
  custom: "#78716c",
};

// ── Normalized bounding box (0-1 relative to frame) ──────────────

export interface NormalizedBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Hotspot: a detected action-* element ─────────────────────────

export interface Hotspot {
  id: string;
  screenId: string;
  figmaNodeId: string;
  label: string;
  elementType: ElementType;
  rawName: string;           // original Figma node name
  bounds: NormalizedBounds;
  connectionId?: string;
}

// ── Connection: where a hotspot leads ────────────────────────────

export interface Connection {
  id: string;
  sourceHotspotId: string;
  sourceScreenId: string;
  targetScreenId: string;
  action: ActionType;
  transition: TransitionType;
  externalUrl?: string;
  notes?: string;
}

// ── Screen: a Figma frame + uploaded image ───────────────────────

export interface Screen {
  id: string;
  figmaFrameId: string;       // Figma node ID of the frame
  name: string;               // from Figma frame name
  /** Uploaded screenshot (base64 data URL) */
  imageDataUrl: string | null;
  /** Frame dimensions from Figma */
  frameDimensions: { w: number; h: number };
  hotspots: Hotspot[];
  position: { x: number; y: number };  // React Flow canvas
  order: number;
  isStartScreen: boolean;
}

// ── Project ──────────────────────────────────────────────────────

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

// ── Figma connection state ───────────────────────────────────────

export interface FigmaConnection {
  token: string;
  fileUrl: string;
  fileKey: string;
  connected: boolean;
  loading: boolean;
  error: string | null;
}
