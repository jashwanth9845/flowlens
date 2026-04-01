import type { FigmaScreenCandidate, Hotspot, ScreenTag } from "../../types";

const TAG_RULES: Record<ScreenTag, string[]> = {
  auth: ["login", "sign in", "otp", "password", "auth", "signup"],
  onboarding: ["onboarding", "welcome", "intro", "tour"],
  home: ["home", "dashboard", "overview"],
  settings: ["settings", "preferences", "profile", "account"],
  modal: ["modal", "dialog", "sheet", "popup"],
  detail: ["detail", "details", "summary"],
  list: ["list", "feed", "history", "activity"],
  form: ["form", "input", "checkout", "edit", "create"],
  success: ["success", "complete", "done", "confirmation"],
  error: ["error", "failed", "empty", "warning"],
};

export function inferScreenTags(input: {
  name: string;
  category: string;
  subcategory: string | null;
  hotspots: Array<Pick<Hotspot, "label" | "elementType">> | FigmaScreenCandidate["hotspots"];
}): ScreenTag[] {
  const haystack = [
    input.name,
    input.category,
    input.subcategory ?? "",
    ...input.hotspots.map((hotspot) => hotspot.label),
    ...input.hotspots.map((hotspot) => hotspot.elementType),
  ]
    .join(" ")
    .toLowerCase();

  const matched = (Object.entries(TAG_RULES) as Array<[ScreenTag, string[]]>)
    .filter(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))
    .map(([tag]) => tag);

  return matched.length > 0 ? matched : ["home"];
}

export function inferConfidence(tagCount: number, hotspotCount: number) {
  const base = tagCount > 0 ? 0.72 : 0.4;
  return Math.min(0.95, base + Math.min(0.2, hotspotCount * 0.02));
}
