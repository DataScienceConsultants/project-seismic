import { fixtureCatalog } from "../../../fixtures/research/catalog.js";

export const RESEARCH_ENDPOINTS = Object.freeze({
  summary: "/research/global/summary", earthquakes: "/research/earthquakes",
  faults: "/research/faults", boundaries: "/research/plate-boundaries",
  region: region => `/research/regions/${encodeURIComponent(region)}`,
  fault: id => `/research/faults/${encodeURIComponent(id)}`,
  sequences: "/research/sequences", sequence: id => `/research/sequences/${encodeURIComponent(id)}`,
  connections: "/research/connections"
});

// The adapter boundary is intentionally async so fixture fallback can later be
// replaced by viewport/time-filtered API requests without changing the UI.
export async function loadResearchCatalog({ bounds, start, end, minimumMagnitude = 6 } = {}) {
  void bounds; void start; void end;
  return { ...fixtureCatalog, earthquakes: fixtureCatalog.earthquakes.filter(event => event.magnitude >= minimumMagnitude) };
}

export function magnitudeClass(magnitude) {
  if (!Number.isFinite(magnitude)) return "Unavailable";
  if (magnitude >= 8) return "GREAT";
  if (magnitude >= 7) return "MAJOR";
  if (magnitude >= 6) return "STRONG";
  return "BELOW M6";
}
