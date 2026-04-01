/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { ELEMENT_COLORS, type Hotspot, type NormalizedBounds, type Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizePoint(
  event: React.PointerEvent<HTMLDivElement>,
  element: HTMLDivElement,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height),
  };
}

function rectFromPoints(start: { x: number; y: number }, end: { x: number; y: number }): NormalizedBounds {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(start.x - end.x),
    h: Math.abs(start.y - end.y),
  };
}

interface ScreenCanvasProps {
  screen: Screen;
  hotspots: Hotspot[];
  selectedHotspotId: string | null;
  drawMode?: boolean;
  interactive?: boolean;
  showLabels?: boolean;
  onSelectHotspot?: (hotspotId: string | null) => void;
  onActivateHotspot?: (hotspot: Hotspot) => void;
  onCreateHotspot?: (geometry: NormalizedBounds) => void;
}

export function ScreenCanvas({
  screen,
  hotspots,
  selectedHotspotId,
  drawMode = false,
  interactive = true,
  showLabels = true,
  onSelectHotspot,
  onActivateHotspot,
  onCreateHotspot,
}: ScreenCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<NormalizedBounds | null>(null);
  const aspectRatio = useMemo(
    () => `${screen.imageWidth} / ${screen.imageHeight}`,
    [screen.imageHeight, screen.imageWidth],
  );

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-xl",
        drawMode && "cursor-crosshair",
      )}
      style={{ aspectRatio }}
      onPointerDown={(event) => {
        if (!drawMode || !interactive || !ref.current) {
          return;
        }

        const point = normalizePoint(event, ref.current);
        setStart(point);
        setDraftRect({ x: point.x, y: point.y, w: 0, h: 0 });
      }}
      onPointerMove={(event) => {
        if (!drawMode || !interactive || !ref.current || !start) {
          return;
        }

        const point = normalizePoint(event, ref.current);
        setDraftRect(rectFromPoints(start, point));
      }}
      onPointerUp={(event) => {
        if (!drawMode || !interactive || !ref.current || !start || !draftRect) {
          return;
        }

        const point = normalizePoint(event, ref.current);
        const geometry = rectFromPoints(start, point);
        setStart(null);
        setDraftRect(null);
        if (geometry.w < 0.03 || geometry.h < 0.03) {
          return;
        }

        onCreateHotspot?.(geometry);
      }}
      onPointerLeave={() => {
        if (!drawMode) {
          return;
        }

        setStart(null);
        setDraftRect(null);
      }}
    >
      <img
        src={screen.imageUrl}
        alt={screen.name}
        draggable={false}
        className="h-full w-full object-cover object-top"
      />

      {hotspots.map((hotspot) => {
        const color = ELEMENT_COLORS[hotspot.elementType];
        const isSelected = hotspot.id === selectedHotspotId;
        return (
          <button
            key={hotspot.id}
            type="button"
            className={cn(
              "absolute rounded-xl border text-left transition",
              interactive ? "cursor-pointer" : "cursor-default",
            )}
            style={{
              left: `${hotspot.geometry.x * 100}%`,
              top: `${hotspot.geometry.y * 100}%`,
              width: `${hotspot.geometry.w * 100}%`,
              height: `${hotspot.geometry.h * 100}%`,
              borderColor: color,
              backgroundColor: `${color}${interactive ? "22" : "12"}`,
              boxShadow: isSelected ? `0 0 0 2px ${color}55 inset` : undefined,
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (interactive) {
                onSelectHotspot?.(hotspot.id);
                onActivateHotspot?.(hotspot);
              }
            }}
          >
            {showLabels ? (
              <span
                className="absolute left-1 top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {hotspot.label}
              </span>
            ) : null}
          </button>
        );
      })}

      {draftRect ? (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-300/10"
          style={{
            left: `${draftRect.x * 100}%`,
            top: `${draftRect.y * 100}%`,
            width: `${draftRect.w * 100}%`,
            height: `${draftRect.h * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}
