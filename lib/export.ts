import type { Project } from "./types";

/**
 * Generate Markdown output for developer handoff / AI agents.
 */
export function generateMarkdown(project: Project): string {
  const screenMap = new Map(project.screens.map((s) => [s.id, s]));
  const lines: string[] = [];

  lines.push(`# ${project.name} — Flow Map`);
  lines.push(`> Figma file: ${project.figmaFileName}`);
  lines.push(`> Exported: ${new Date().toLocaleString()}`);
  lines.push("");

  // Summary
  const totalActions = project.screens.reduce((sum, s) => sum + s.hotspots.length, 0);
  lines.push("## Summary");
  lines.push(`- **Screens**: ${project.screens.length}`);
  lines.push(`- **Interactive elements**: ${totalActions}`);
  lines.push(`- **Connections**: ${project.connections.length}`);

  // Orphan / dead-end detection
  const targetIds = new Set(project.connections.map((c) => c.targetScreenId));
  const sourceIds = new Set(project.connections.map((c) => c.sourceScreenId));
  const orphans = project.screens.filter((s) => !s.isStartScreen && !targetIds.has(s.id));
  const deadEnds = project.screens.filter((s) => !sourceIds.has(s.id));

  if (orphans.length > 0) {
    lines.push(`- **Unreachable**: ${orphans.map((s) => s.name).join(", ")}`);
  }
  if (deadEnds.length > 0) {
    lines.push(`- **Dead ends**: ${deadEnds.map((s) => s.name).join(", ")}`);
  }
  lines.push("");

  // Screens
  lines.push("## Screens");
  for (const screen of project.screens) {
    const star = screen.isStartScreen ? " ⭐" : "";
    lines.push(`### ${screen.name}${star}`);
    lines.push(`- Figma frame: \`${screen.figmaFrameId}\``);
    lines.push(`- Dimensions: ${screen.frameDimensions.w}×${screen.frameDimensions.h}`);

    if (screen.hotspots.length === 0) {
      lines.push("- No action elements");
    }
    for (const h of screen.hotspots) {
      const conn = project.connections.find((c) => c.sourceHotspotId === h.id);
      const target = conn ? screenMap.get(conn.targetScreenId) : null;
      const arrow = target ? ` → **${target.name}** (${conn!.action})` : "";
      lines.push(`- \`${h.rawName}\` — ${h.elementType}: **${h.label}**${arrow}`);
    }
    lines.push("");
  }

  // Flows
  lines.push("## Navigation Flows");
  for (const conn of project.connections) {
    const src = screenMap.get(conn.sourceScreenId);
    const tgt = screenMap.get(conn.targetScreenId);
    const hotspot = src?.hotspots.find((h) => h.id === conn.sourceHotspotId);
    lines.push(
      `- ${src?.name} → \`${hotspot?.rawName}\` → **${tgt?.name}** [${conn.action}, ${conn.transition}]`
    );
  }

  return lines.join("\n");
}
