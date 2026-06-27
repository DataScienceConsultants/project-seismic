import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../config.js";

let map;

export function createMap() {
  map = L.map("map", {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    zoomControl: false
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "© OpenStreetMap © CARTO",
    maxZoom: 19
  }).addTo(map);

  return map;
}

export function getMap() {
  return map;
}
