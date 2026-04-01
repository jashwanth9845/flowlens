import { isActionNode, parseActionName } from "./naming-convention";
import type {
  ElementType,
  FigmaParseResult,
  FigmaScreenCandidate,
  NormalizedBounds,
} from "./types";

interface FigmaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FigmaNode {
  id: string;
  name?: string;
  type?: string;
  absoluteBoundingBox?: FigmaBounds;
  children?: FigmaNode[];
}

interface FigmaFilePayload {
  name?: string;
  lastModified?: string;
  document?: {
    children?: FigmaNode[];
  };
}

const SCREEN_NODE_TYPES = new Set(["FRAME", "COMPONENT", "COMPONENT_SET"]);
const MIN_SCREEN_WIDTH = 220;
const MIN_SCREEN_HEIGHT = 300;

function normalizeBounds(nodeBounds: FigmaBounds, frameBounds: FigmaBounds): NormalizedBounds {
  if (frameBounds.width === 0 || frameBounds.height === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  const nx = (nodeBounds.x - frameBounds.x) / frameBounds.width;
  const ny = (nodeBounds.y - frameBounds.y) / frameBounds.height;
  const nw = nodeBounds.width / frameBounds.width;
  const nh = nodeBounds.height / frameBounds.height;

  return {
    x: Math.max(0, Math.min(1, nx)),
    y: Math.max(0, Math.min(1, ny)),
    w: Math.max(0, Math.min(1 - Math.max(0, nx), nw)),
    h: Math.max(0, Math.min(1 - Math.max(0, ny), nh)),
  };
}

function collectHotspots(node: FigmaNode, frameBounds: FigmaBounds, results: FigmaScreenCandidate["hotspots"]) {
  if (node.name && isActionNode(node.name) && node.absoluteBoundingBox) {
    const parsed = parseActionName(node.name);
    if (parsed) {
      results.push({
        figmaNodeId: node.id,
        label: parsed.label,
        elementType: parsed.elementType,
        rawName: parsed.rawName,
        normalizedBounds: normalizeBounds(node.absoluteBoundingBox, frameBounds),
      });
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectHotspots(child, frameBounds, results);
    }
  }
}

function isScreenCandidate(node: FigmaNode) {
  const bounds = node.absoluteBoundingBox;
  if (!node.type || !SCREEN_NODE_TYPES.has(node.type) || !bounds) {
    return false;
  }

  return bounds.width >= MIN_SCREEN_WIDTH && bounds.height >= MIN_SCREEN_HEIGHT;
}

function collectScreens(
  nodes: FigmaNode[] | undefined,
  pageName: string,
  sectionName: string | null,
  results: FigmaScreenCandidate[],
) {
  if (!nodes) {
    return;
  }

  for (const node of nodes) {
    if (node.type === "SECTION") {
      collectScreens(node.children, pageName, node.name ?? "Untitled section", results);
      continue;
    }

    if (isScreenCandidate(node) && node.absoluteBoundingBox) {
      const hotspots: FigmaScreenCandidate["hotspots"] = [];
      collectHotspots(node, node.absoluteBoundingBox, hotspots);
      results.push({
        figmaNodeId: node.id,
        name: node.name ?? "Untitled screen",
        pageName,
        sectionName,
        absoluteBounds: node.absoluteBoundingBox,
        hotspots,
      });
    }
  }
}

export function parseFigmaFile(fileKey: string, fileData: FigmaFilePayload): FigmaParseResult {
  const pages = fileData.document?.children ?? [];
  const screens: FigmaScreenCandidate[] = [];

  for (const page of pages) {
    const pageName = page.name ?? "Untitled page";
    collectScreens(page.children, pageName, null, screens);
  }

  return {
    fileName: fileData.name ?? "Untitled Figma file",
    fileKey,
    lastModified: fileData.lastModified,
    screens,
  };
}

export function extractFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export function inferElementTypeFromHotspots(elementTypes: ElementType[]): ElementType {
  return elementTypes[0] ?? "button";
}
