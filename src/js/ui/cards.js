import { getMagnitudeColor } from "../map/markers.js";

function formatRelativeTime(timestamp) {
  const eventTime = Number(timestamp);

  if (!Number.isFinite(eventTime)) {
    return "Time unavailable";
  }

  const differenceMs = Date.now() - eventTime;
  const differenceMinutes = Math.max(
    0,
    Math.floor(differenceMs / 60000)
  );

  if (differenceMinutes < 1) {
    return "Just now";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes} min ago`;
  }

  const differenceHours = Math.floor(
    differenceMinutes / 60
  );

  if (differenceHours < 24) {
    return `${differenceHours} hr${
      differenceHours === 1 ? "" : "s"
    } ago`;
  }

  const differenceDays = Math.floor(
    differenceHours / 24
  );

  if (differenceDays === 1) {
    return "Yesterday";
  }

  return `${differenceDays} days ago`;
}

function getDepth(feature) {
  const depth =
    Number(feature.geometry?.coordinates?.[2]);

  return Number.isFinite(depth)
    ? `${depth.toFixed(1)} km deep`
    : "Depth unavailable";
}

export function renderEarthquakeCards(
  container,
  earthquakes
) {
  container.innerHTML = "";

  if (!Array.isArray(earthquakes) || earthquakes.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "earthquake-empty-state";
    emptyState.textContent =
      "No earthquakes match the selected filters.";

    container.appendChild(emptyState);
    return;
  }

  earthquakes.slice(0, 50).forEach(feature => {
    const magnitude =
      Number(feature.properties?.mag) || 0;

    const place =
      feature.properties?.place ||
      "Unknown location";

    const time =
      feature.properties?.time;

    const card =
      document.createElement("article");

    card.className = "earthquake-card";

    const badge =
      document.createElement("div");

    badge.className = "magnitude-badge";
    badge.style.backgroundColor =
      getMagnitudeColor(magnitude);

    badge.textContent =
      `M${magnitude.toFixed(1)}`;

    const content =
      document.createElement("div");

    content.className =
      "earthquake-card-content";

    const title =
      document.createElement("strong");

    title.className =
      "earthquake-card-title";

    title.textContent =
      place;

    const details =
      document.createElement("div");

    details.className =
      "earthquake-card-details";

    const timeRow =
      document.createElement("span");

    timeRow.className =
      "earthquake-card-meta";

    timeRow.textContent =
      `🕒 ${formatRelativeTime(time)}`;

    const depthRow =
      document.createElement("span");

    depthRow.className =
      "earthquake-card-meta";

    depthRow.textContent =
      `↕ ${getDepth(feature)}`;

    details.appendChild(timeRow);
    details.appendChild(depthRow);

    content.appendChild(title);
    content.appendChild(details);

    card.appendChild(badge);
    card.appendChild(content);

    container.appendChild(card);
  });
}
