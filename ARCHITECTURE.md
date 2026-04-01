# FlowLens Architecture

## Overview

FlowLens is a visual prototype & flow builder that reads Figma files using a naming convention (`action-{type}-{label}`) to detect all interactive elements, then lets designers upload screenshots, connect actions to target screens, and visualize the complete app flow.

**No AI. No cost. Just Figma API (free) + naming convention.**

## How it works

1. Designer names interactive Figma components: `action-button-deposit`, `action-link-settings`, etc.
2. FlowLens connects to Figma via REST API, reads the node tree
3. Parser finds all `action-*` nodes, extracts type + label + bounding box
4. Groups nodes by parent frame (each frame = a screen)
5. Designer uploads screenshots for each screen
6. Hotspots auto-overlay on the images using normalized bounding boxes
7. Designer connects actions to target screens
8. FlowLens visualizes the complete flow + provides a prototype player

## Key files

| File | Purpose |
|---|---|
| `lib/naming-convention.ts` | Parses `action-{type}-{label}` node names |
| `lib/figma-parser.ts` | Traverses Figma node tree, finds actions, normalizes bounds |
| `lib/types.ts` | All TypeScript interfaces |
| `lib/store.ts` | Zustand state management |
| `lib/export.ts` | JSON + Markdown export |
| `app/api/figma/route.ts` | Next.js proxy for Figma REST API (CORS fix) |
| `components/editor/HotspotOverlay.tsx` | Renders action hotspots over screen images |
| `NAMING_CONVENTION.md` | Designer-facing guide |

## Compared to AgentUX

| | AgentUX | FlowLens |
|---|---|---|
| Input | Codebase | Figma file + screenshots |
| Detection | Babel AST | Naming convention |
| Users | Developers | Designers + Developers |
| Prototype | None | Full player |
| Standalone | No | Yes |
| Cost | Free | Free |
