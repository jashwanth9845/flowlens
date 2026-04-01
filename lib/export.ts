import type { Project } from "./types";

export function generateMarkdown(project: Project): string {
  const screenMap = new Map(project.screens.map((screen) => [screen.id, screen]));
  const lines: string[] = [];

  lines.push(`# ${project.name} — FlowLens export`);
  lines.push(`> Source: ${project.sourceMode}`);
  lines.push(`> Updated: ${new Date(project.updatedAt).toLocaleString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Screens: ${project.screens.length}`);
  lines.push(`- Connections: ${project.connections.length}`);
  lines.push(`- Sync status: ${project.syncStatus}`);
  lines.push("");
  lines.push("## Screens");

  for (const screen of project.screens) {
    const category = screen.subcategory
      ? `${screen.category} / ${screen.subcategory}`
      : screen.category;

    lines.push(`### ${screen.name}${screen.isStartScreen ? " (start)" : ""}`);
    lines.push(`- Category: ${category}`);
    lines.push(`- Tags: ${screen.tags.join(", ") || "none"}`);
    lines.push(`- Hotspots: ${screen.hotspots.length}`);

    for (const hotspot of screen.hotspots) {
      const connection = project.connections.find(
        (candidate) => candidate.sourceHotspotId === hotspot.id,
      );
      const target = connection?.targetScreenId
        ? screenMap.get(connection.targetScreenId)
        : null;
      const destination = target
        ? target.name
        : connection?.targetUrl ?? "unlinked";
      lines.push(
        `- ${hotspot.label} [${hotspot.elementType}] -> ${connection?.action ?? "none"} -> ${destination}`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}
