import { formatTime } from "../utils/helpers.js";
import { getMagnitudeColor } from "../map/markers.js";

export function renderEarthquakeCards(container, earthquakes) {
  container.innerHTML = "";

  earthquakes.slice(0, 50).forEach(feature => {
    const magnitude = Number(feature.properties.mag) || 0;
    const place = feature.properties.place || "Unknown location";
    const time = feature.properties.time;

    const card = document.createElement("article");
    card.className = "earthquake-card";

    const badge = document.createElement("div");
    badge.className = "magnitude-badge";
    badge.style.backgroundColor = getMagnitudeColor(magnitude);
    badge.textContent = `M${magnitude.toFixed(1)}`;

    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = place;

    const meta = document.createElement("small");
    meta.textContent = formatTime(time);

    content.appendChild(title);
    content.appendChild(meta);
    card.appendChild(badge);
    card.appendChild(content);
    container.appendChild(card);
  });
}
