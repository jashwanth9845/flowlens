/**
 * figma-parser.ts
 *
 * Traverses a Figma file's node tree to:
 *  1. Find all top-level frames (= screens)
 *  2. Within each frame, find all action-* nodes (= interactive elements)
 *  3. Normalize bounding boxes relative to the parent frame
 */

import { isActionNode, parseActionName } from "./naming-convention";
import type { ElementType, NormalizedBounds } from "./types";

// ── Types returned by the parser ─────────────────────────────────

export interface ParsedHotspot {
  figmaNodeId: string;
  label: string;
  elementType: ElementType;
  rawName: string;
  /** Absolute bounding box from Figma (pixels) */
  absoluteBounds: { x: number; y: number; width: number; height: number };
  /** Normalized bounds (0-1) relative to parent frame */
  normalizedBounds: NormalizedBounds;
}

export interface ParsedFrame {
  figmaNodeId: string;
  name: string;
  /** Absolute bounding box of the frame */
  absoluteBounds: { x: number; y: number; width: number; height: number };
  /** All detected action-* nodes inside this frame */
  hotspots: ParsedHotspot[];
  /** Total child nodes in this frame (for stats) */
  totalNodes: number;
}

export interface ParseResult {
  fileName: string;
  pages: {
    name: string;
    frames: ParsedFrame[];
  }[];
  /** Flat list of all frames across all pages */
  allFrames: ParsedFrame[];
  /** Total action nodes found */
  totalActions: number;
  /** Summary by type */
  summary: Record<string, number>;
}

// ── Bounding box normalization ───────────────────────────────────

function normalizeBounds(
  nodeBounds: { x: number; y: number; width: number; height: number },
  frameBounds: { x: number; y: number; width: number; height: number }
): NormalizedBounds {
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

// ── Recursive node traversal ─────────────────────────────────────

function findActions(
  node: any,
  frameBounds: { x: number; y: number; width: number; height: number },
  results: ParsedHotspot[],
): number {
  let count = 1;

  // Check if this node matches the naming convention
  if (node.name && isActionNode(node.name)) {
    const parsed = parseActionName(node.name);
    if (parsed && node.absoluteBoundingBox) {
      results.push({
        figmaNodeId: node.id,
        label: parsed.label,
        elementType: parsed.elementType,
        rawName: parsed.rawName,
        absoluteBounds: {
          x: node.absoluteBoundingBox.x,
          y: node.absoluteBoundingBox.y,
          width: node.absoluteBoundingBox.width,
          height: node.absoluteBoundingBox.height,
        },
        normalizedBounds: normalizeBounds(
          node.absoluteBoundingBox,
          frameBounds
        ),
      });
    }
  }

  // Recurse into children
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += findActions(child, frameBounds, results);
    }
  }

  return count;
}

// ── Main parser ──────────────────────────────────────────────────

export function parseFigmaFile(fileData: any): ParseResult {
  const pages: ParseResult["pages"] = [];
  const allFrames: ParsedFrame[] = [];
  let totalActions = 0;
  const summary: Record<string, number> = {};

  const document = fileData.document;
  if (!document || !document.children) {
    return {
      fileName: fileData.name || "Unknown",
      pages: [],
      allFrames: [],
      totalActions: 0,
      summary: {},
    };
  }

  // Iterate pages
  for (const page of document.children) {
    const pageFrames: ParsedFrame[] = [];

    if (!page.children) continue;

    // Each direct child of a page that is a FRAME or COMPONENT_SET = a screen
    for (const child of page.children) {
      // Accept FRAME, COMPONENT, COMPONENT_SET as top-level screens
      // Skip small utility components (width/height < 100)
      const isFrame = ["FRAME", "COMPONENT", "COMPONENT_SET", "SECTION"].includes(child.type);
      const hasBounds = child.absoluteBoundingBox;
      const isLargeEnough =
        hasBounds &&
        child.absoluteBoundingBox.width >= 100 &&
        child.absoluteBoundingBox.height >= 100;

      if (!isFrame || !hasBounds || !isLargeEnough) continue;

      const frameBounds = {
        x: child.absoluteBoundingBox.x,
        y: child.absoluteBoundingBox.y,
        width: child.absoluteBoundingBox.width,
        height: child.absoluteBoundingBox.height,
      };

      const hotspots: ParsedHotspot[] = [];
      const totalNodes = findActions(child, frameBounds, hotspots);

      // Track summary
      for (const h of hotspots) {
        summary[h.elementType] = (summary[h.elementType] || 0) + 1;
      }
      totalActions += hotspots.length;

      const frame: ParsedFrame = {
        figmaNodeId: child.id,
        name: child.name,
        absoluteBounds: frameBounds,
        hotspots,
        totalNodes,
      };

      pageFrames.push(frame);
      allFrames.push(frame);
    }

    if (pageFrames.length > 0) {
      pages.push({ name: page.name, frames: pageFrames });
    }
  }

  return {
    fileName: fileData.name || "Unknown",
    pages,
    allFrames,
    totalActions,
    summary,
  };
}

/**
 * Parse a Figma URL to extract the file key.
 */
export function extractFileKey(url: string): string | null {
  const match = url.match(
    /figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/
  );
  return match ? match[1] : null;
}
