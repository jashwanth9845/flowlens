"use client";
import { useState } from "react";
import type { Hotspot } from "@/lib/types";
import { ELEMENT_COLORS } from "@/lib/types";

interface Props {
  imageUrl: string;
  hotspots: Hotspot[];
  selectedId?: string | null;
  onHotspotClick?: (h: Hotspot) => void;
  playerMode?: boolean;
  scale?: number;
}

export default function HotspotOverlay({ imageUrl, hotspots, selectedId, onHotspotClick, playerMode, scale = 1 }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <img src={imageUrl} alt="" style={{ display: "block", width: "100%", height: "auto", pointerEvents: "none" }} draggable={false} />
      {hotspots.map((h) => {
        const c = ELEMENT_COLORS[h.elementType] || "#3b82f6";
        const isHov = hovered === h.id, isSel = selectedId === h.id, linked = !!h.connectionId;
        const bgA = playerMode ? (isHov ? "3d" : "00") : (isSel ? "55" : isHov ? "40" : "22");
        const brA = playerMode ? (isHov ? "99" : "00") : (isSel ? "cc" : isHov ? "aa" : "55");
        return (
          <div key={h.id}
            onMouseEnter={() => setHovered(h.id)} onMouseLeave={() => setHovered(null)}
            onClick={(e) => { e.stopPropagation(); onHotspotClick?.(h); }}
            style={{
              position: "absolute", left: `${h.bounds.x*100}%`, top: `${h.bounds.y*100}%`,
              width: `${h.bounds.w*100}%`, height: `${h.bounds.h*100}%`,
              backgroundColor: `${c}${bgA}`, border: `${isSel?2:1.5}px solid ${c}${brA}`,
              borderRadius: 4*scale, cursor: "pointer", transition: "all .15s", zIndex: isHov||isSel?10:1,
            }}>
            {(isHov||isSel) && scale>=0.4 && (
              <div style={{
                position:"absolute",bottom:"calc(100% + 4px)",left:"50%",transform:"translateX(-50%)",
                padding:`${2*scale}px ${8*scale}px`, backgroundColor:c, color:"#fff",
                fontSize:Math.max(9,11*scale), fontWeight:600, borderRadius:4*scale,
                whiteSpace:"nowrap", pointerEvents:"none", lineHeight:1.3,
              }}>
                {h.label}{linked && " →"}
              </div>
            )}
            {linked && !playerMode && (
              <div style={{
                position:"absolute",top:-3*scale,right:-3*scale,
                width:8*scale,height:8*scale,borderRadius:"50%",
                backgroundColor:"#10b981",border:"1.5px solid #09090b",
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}
