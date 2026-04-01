"use client";

import { useState, type ReactNode } from "react";
import type { Hotspot } from "@/lib/types";
import { ELEMENT_COLORS } from "@/lib/types";

interface Props {
  imageUrl: string;
  hotspots: Hotspot[];
  selectedHotspotId?: string | null;
  onHotspotClick?: (hotspot: Hotspot) => void;
  /** Player mode: hotspots invisible until hover */
  playerMode?: boolean;
  /** Scale (for thumbnail views in React Flow nodes) */
  scale?: number;
  children?: ReactNode;
}

export default function HotspotOverlay({
  imageUrl,
  hotspots,
  selectedHotspotId,
  onHotspotClick,
  playerMode = false,
  scale = 1,
  children,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <img
        src={imageUrl}
        alt="Screen"
        style={{ display: "block", width: "100%", height: "auto", pointerEvents: "none" }}
        draggable={false}
      />

      {hotspots.map((h) => {
        const color = ELEMENT_COLORS[h.elementType] || "#3b82f6";
        const hovered = hoveredId === h.id;
        const selected = selectedHotspotId === h.id;
        const connected = !!h.connectionId;

        const bgAlpha = playerMode
          ? hovered ? "3d" : "00"
          : selected ? "55" : hovered ? "40" : "22";

        const borderAlpha = playerMode
          ? hovered ? "99" : "00"
          : selected ? "cc" : hovered ? "aa" : "55";

        return (
          <div
            key={h.id}
            onMouseEnter={() => setHoveredId(h.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={(e) => { e.stopPropagation(); onHotspotClick?.(h); }}
            style={{
              position: "absolute",
              left: `${h.bounds.x * 100}%`,
              top: `${h.bounds.y * 100}%`,
              width: `${h.bounds.w * 100}%`,
              height: `${h.bounds.h * 100}%`,
              backgroundColor: `${color}${bgAlpha}`,
              border: `${selected ? 2 : 1.5}px solid ${color}${borderAlpha}`,
              borderRadius: 4 * scale,
              cursor: "pointer",
              transition: "all 0.15s ease",
              zIndex: hovered || selected ? 10 : 1,
            }}
          >
            {/* Label */}
            {(hovered || selected) && scale >= 0.4 && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: `${2 * scale}px ${8 * scale}px`,
                  backgroundColor: color,
                  color: "#fff",
                  fontSize: Math.max(9, 11 * scale),
                  fontWeight: 600,
                  borderRadius: 4 * scale,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  lineHeight: 1.3,
                }}
              >
                {h.label}
                {connected && " →"}
              </div>
            )}

            {/* Connected indicator */}
            {connected && !playerMode && (
              <div
                style={{
                  position: "absolute",
                  top: -3 * scale,
                  right: -3 * scale,
                  width: 8 * scale,
                  height: 8 * scale,
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  border: "1.5px solid #0a0a0b",
                }}
              />
            )}
          </div>
        );
      })}

      {children}
    </div>
  );
}
