/**
 * naming-convention.ts
 *
 * Parses Figma node names matching the pattern:
 *   action-{type}-{label}
 *
 * Examples:
 *   "action-button-deposit"       → { type: "button",      label: "Deposit" }
 *   "action-button-sign-in"       → { type: "button",      label: "Sign In" }
 *   "action-link-settings"        → { type: "link",        label: "Settings" }
 *   "action-nav-home"             → { type: "nav-item",    label: "Home" }
 *   "action-icon-back"            → { type: "icon-button", label: "Back" }
 *   "action-input-search"         → { type: "input",       label: "Search" }
 *   "action-dropdown-currency"    → { type: "dropdown",    label: "Currency" }
 *   "action-toggle-dark-mode"     → { type: "toggle",      label: "Dark Mode" }
 *   "action-card-recent-transfer" → { type: "card",        label: "Recent Transfer" }
 *   "action-fab-add"              → { type: "fab",          label: "Add" }
 *   "action-menu-logout"          → { type: "menu-item",   label: "Logout" }
 *   "action-chip-filter-date"     → { type: "chip",        label: "Filter Date" }
 */

import type { ElementType } from "./types";

// ── Type aliases (short names → canonical types) ─────────────────

const TYPE_MAP: Record<string, ElementType> = {
  // Exact matches
  button: "button",
  btn: "button",
  "icon-button": "icon-button",
  icon: "icon-button",
  input: "input",
  textfield: "input",
  search: "input",
  dropdown: "dropdown",
  select: "dropdown",
  toggle: "toggle",
  switch: "toggle",
  checkbox: "checkbox",
  check: "checkbox",
  radio: "radio",
  tab: "tab",
  link: "link",
  "nav-item": "nav-item",
  nav: "nav-item",
  card: "card",
  "menu-item": "menu-item",
  menu: "menu-item",
  fab: "fab",
  chip: "chip",
  tag: "chip",
};

// ── Parser ───────────────────────────────────────────────────────

export interface ParsedAction {
  elementType: ElementType;
  label: string;
  rawName: string;
}

/**
 * Check if a node name matches the action naming convention.
 */
export function isActionNode(name: string): boolean {
  return /^action-/i.test(name.trim());
}

/**
 * Parse an action node name into type + label.
 * Returns null if the name doesn't match the convention.
 *
 * Strategy:
 *  1. Strip "action-" prefix
 *  2. Try matching known type aliases from longest to shortest
 *  3. Everything after the type slug becomes the label
 */
export function parseActionName(name: string): ParsedAction | null {
  const trimmed = name.trim();
  if (!isActionNode(trimmed)) return null;

  // Remove "action-" prefix (case-insensitive)
  const rest = trimmed.replace(/^action-/i, "");
  if (!rest) return null;

  // Sort type keys by length (longest first) to match "icon-button" before "icon"
  const sortedTypes = Object.keys(TYPE_MAP).sort(
    (a, b) => b.length - a.length
  );

  for (const typeKey of sortedTypes) {
    // Check if rest starts with this type key followed by "-" or end of string
    if (
      rest === typeKey ||
      rest.startsWith(typeKey + "-")
    ) {
      const labelSlug = rest.slice(typeKey.length + 1); // +1 for the "-"
      const label = labelSlug
        ? slugToLabel(labelSlug)
        : TYPE_MAP[typeKey]; // fallback label = type name

      return {
        elementType: TYPE_MAP[typeKey],
        label,
        rawName: trimmed,
      };
    }
  }

  // If no type matched, treat first segment as type, rest as label
  const firstDash = rest.indexOf("-");
  if (firstDash === -1) {
    return {
      elementType: "button", // default
      label: slugToLabel(rest),
      rawName: trimmed,
    };
  }

  const typeSlug = rest.slice(0, firstDash);
  const labelSlug = rest.slice(firstDash + 1);

  return {
    elementType: TYPE_MAP[typeSlug] || "button",
    label: slugToLabel(labelSlug),
    rawName: trimmed,
  };
}

/**
 * Convert a slug like "sign-in" or "dark-mode" to "Sign In" or "Dark Mode".
 */
function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get all supported type names (for documentation / UI display).
 */
export function getSupportedTypes(): { alias: string; type: ElementType }[] {
  return Object.entries(TYPE_MAP).map(([alias, type]) => ({ alias, type }));
}
