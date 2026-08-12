import { createResearchLayers } from "./research-layers.js";

export function createResearchMap(onSelect) {
  const map = L.map("researchMap", { center: [20, 10], zoom: 2, minZoom: 2, preferCanvas: true, worldCopyJump: true, zoomControl: false });
  L.control.zoom({ position: "bottomleft" }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap © CARTO", maxZoom: 18 }).addTo(map);
  return { map, layers: createResearchLayers(map, onSelect) };
}
