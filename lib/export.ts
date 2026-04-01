import type { Project } from "./types";

export function generateMarkdown(project: Project): string {
  const sm = new Map(project.screens.map((s) => [s.id, s]));
  const lines: string[] = [];
  lines.push(`# ${project.name} — Flow Map`);
  lines.push(`> Figma: ${project.figmaFileName} · Exported: ${new Date().toLocaleString()}`);
  lines.push("");

  const totalActions = project.screens.reduce((n, s) => n + s.hotspots.length, 0);
  lines.push(`**${project.screens.length}** screens · **${totalActions}** actions · **${project.connections.length}** connections`);
  lines.push("");

  const cats = new Set(project.screens.map((s) => s.category));
  for (const cat of cats) {
    lines.push(`## ${cat}`);
    const screens = project.screens.filter((s) => s.category === cat);
    for (const screen of screens) {
      const star = screen.isStartScreen ? " ⭐" : "";
      lines.push(`### ${screen.name}${star}`);
      if (screen.subcategory) lines.push(`> Section: ${screen.subcategory}`);
      for (const h of screen.hotspots) {
        const conn = project.connections.find((c) => c.sourceHotspotId === h.id);
        const tgt = conn?.targetScreenId ? sm.get(conn.targetScreenId) : null;
        const arrow = tgt ? ` → **${tgt.name}** (${conn!.action})` : "";
        lines.push(`- \`${h.rawName}\` ${h.elementType}: **${h.label}**${arrow}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}
