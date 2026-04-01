export const ELEMENT_TYPES = [
  "button",
  "icon-button",
  "input",
  "dropdown",
  "toggle",
  "checkbox",
  "radio",
  "tab",
  "link",
  "nav-item",
  "card",
  "menu-item",
  "fab",
  "chip",
  "custom",
] as const;

export const SCREEN_TAGS = [
  "auth",
  "onboarding",
  "home",
  "settings",
  "modal",
  "detail",
  "list",
  "form",
  "success",
  "error",
] as const;

export const SCREEN_FILTERS = [
  "all",
  "start",
  "unlinked",
  "dead-end",
  "no-hotspots",
  "changed-since-last-sync",
  "manual",
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];
export type ScreenTag = (typeof SCREEN_TAGS)[number];
export type ScreenFilter = (typeof SCREEN_FILTERS)[number];
export type ProjectSourceMode = "figma" | "manual" | "hybrid";
export type SyncStatus = "draft" | "queued" | "running" | "complete" | "failed";
export type ScreenSourceType = "figma" | "manual";
export type HotspotSourceType = "figma" | "manual";
export type ImportSourceMode = "figma" | "manual";
export type FigmaConnectionMode = "oauth" | "pat";
export type ConnectionAction = "navigate" | "back" | "open_overlay" | "open_url";
export type TransitionType =
  | "push"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "none";

export interface NormalizedBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hotspot {
  id: string;
  screenId: string;
  figmaNodeId?: string;
  label: string;
  elementType: ElementType;
  rawName: string;
  sourceType: HotspotSourceType;
  editable: boolean;
  geometry: NormalizedBounds;
  connectionId?: string;
}

export interface Connection {
  id: string;
  sourceHotspotId: string;
  sourceScreenId: string;
  action: ConnectionAction;
  transition: TransitionType;
  targetScreenId?: string;
  targetUrl?: string;
}

export interface Screen {
  id: string;
  projectId: string;
  name: string;
  category: string;
  subcategory: string | null;
  tags: ScreenTag[];
  sourceType: ScreenSourceType;
  sourceNodeId?: string;
  imageAssetKey: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  analysisConfidence: number;
  hotspots: Hotspot[];
  order: number;
  isStartScreen: boolean;
  changedSinceLastSync: boolean;
  lastSyncedAt: string | null;
}

export interface ProjectViewState {
  selectedScreenId: string | null;
  searchQuery: string;
  activeFilter: ScreenFilter;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  sourceMode: ProjectSourceMode;
  syncStatus: SyncStatus;
  figmaFileKey?: string;
  figmaFileName?: string;
  figmaLastModified?: string;
  lastImportAt: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  screens: Screen[];
  connections: Connection[];
  viewState: ProjectViewState;
}

export interface FigmaConnection {
  id: string;
  userId: string;
  mode: FigmaConnectionMode;
  displayName: string;
  scopes: string[];
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  patTokenEncrypted?: string;
  tokenExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
}

export interface ProjectImport {
  id: string;
  userId: string;
  projectId: string;
  sourceMode: ImportSourceMode;
  status: SyncStatus;
  sourceLabel: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ShareLink {
  id: string;
  projectId: string;
  token: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface LocalUserRecord {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreData {
  users: LocalUserRecord[];
  projects: Project[];
  figmaConnections: FigmaConnection[];
  imports: ProjectImport[];
  shareLinks: ShareLink[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  sourceMode: ProjectSourceMode;
  syncStatus: SyncStatus;
  screenCount: number;
  connectionCount: number;
  categoryCount: number;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface FigmaScreenCandidate {
  figmaNodeId: string;
  name: string;
  pageName: string;
  sectionName: string | null;
  absoluteBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hotspots: {
    figmaNodeId: string;
    label: string;
    elementType: ElementType;
    rawName: string;
    normalizedBounds: NormalizedBounds;
  }[];
}

export interface FigmaParseResult {
  fileName: string;
  fileKey: string;
  lastModified?: string;
  screens: FigmaScreenCandidate[];
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  button: "#2563eb",
  "icon-button": "#6d28d9",
  input: "#d97706",
  dropdown: "#9333ea",
  toggle: "#059669",
  checkbox: "#0891b2",
  radio: "#0284c7",
  tab: "#db2777",
  link: "#0f766e",
  "nav-item": "#475569",
  card: "#ea580c",
  "menu-item": "#7c3aed",
  fab: "#c026d3",
  chip: "#65a30d",
  custom: "#78716c",
};
