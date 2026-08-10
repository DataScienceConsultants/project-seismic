const STATUS_DETAILS = {
  normal: {
    badge: "🟢",
    description:
      "Historical seismic activity is within the expected range for this region."
  },
  elevated: {
    badge: "🟡",
    description:
      "Recent seismic activity is elevated relative to the historical baseline."
  },
  high: {
    badge: "🟠",
    description:
      "Historical activity is substantially above the typical range for this region."
  },
  critical: {
    badge: "🔴",
    description:
      "Historical activity is at an unusually high level relative to the observed baseline."
  }
};

function getElements() {
  return {
    card: document.getElementById("observatoryCard"),
    badge: document.getElementById("observatoryBadge"),
    status: document.getElementById("observatoryStatus"),
    description: document.getElementById("observatoryDescription"),
    score: document.getElementById("observatoryScore"),
    trend: document.getElementById("observatoryTrend"),
    trendStrength: document.getElementById("observatoryTrendStrength"),
    region: document.getElementById("observatoryRegion"),
    updated: document.getElementById("observatoryUpdated"),
    eventCount: document.getElementById("observatoryEventCount")
  };
}

function hasAllElements(elements) {
  return Object.values(elements).every(Boolean);
}

function humanize(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "--";
  }

  const normalized = value.trim().replace(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDate(value) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "Analysis date unavailable";
  }

  return `Analyzed through ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(date)}`;
}

function toFiniteNumber(value) {
  if (value === null || value === "" || typeof value === "boolean") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function setPlaceholderMetrics(elements) {
  elements.score.textContent = "--";
  elements.trend.textContent = "--";
  elements.trendStrength.textContent = "--";
  elements.eventCount.textContent = "--";
}

export function renderObservatoryLoading() {
  const elements = getElements();

  if (!hasAllElements(elements)) {
    return;
  }

  elements.card.dataset.status = "neutral";
  elements.card.classList.add("is-loading");
  elements.badge.textContent = "○";
  elements.status.textContent = "Analyzing historical activity…";
  elements.description.textContent =
    "Project Athena is comparing current seismic activity with historical observations.";
  elements.region.textContent =
    "Puerto Rico and the Virgin Islands";
  elements.updated.textContent = "Analysis date unavailable";
  setPlaceholderMetrics(elements);
}

export function renderObservatory(summary) {
  const elements = getElements();

  if (!hasAllElements(elements)) {
    return;
  }
  elements.card.classList.remove("is-loading");

  const rawStatus =
    typeof summary.overall_status === "string"
      ? summary.overall_status.trim().toLowerCase()
      : "";
  const details = STATUS_DETAILS[rawStatus];
  const score = toFiniteNumber(summary.latest_anomaly_score);
  const eventCount = toFiniteNumber(summary.source_event_count);
  const trendStrength = humanize(summary.trend_strength);

  elements.card.dataset.status = details ? rawStatus : "neutral";
  elements.badge.textContent = details?.badge || "○";
  elements.status.textContent = rawStatus
    ? rawStatus.toUpperCase()
    : "STATUS UNAVAILABLE";
  elements.description.textContent = details?.description ||
    "Historical seismic conditions have been analyzed for this region.";
  elements.score.textContent = score !== null
    ? score.toFixed(1)
    : "--";
  elements.trend.textContent = humanize(summary.trend_direction);
  elements.trendStrength.textContent = trendStrength === "--"
    ? "--"
    : `${trendStrength} trend strength`;
  elements.region.textContent =
    typeof summary.region_name === "string" && summary.region_name.trim()
      ? summary.region_name.trim()
      : "Region unavailable";
  elements.updated.textContent = formatDate(summary.catalog_as_of_utc);
  elements.eventCount.textContent = eventCount !== null
    ? eventCount.toLocaleString()
    : "--";
}

export function renderObservatoryError() {
  const elements = getElements();

  if (!hasAllElements(elements)) {
    return;
  }

  elements.card.dataset.status = "neutral";
  elements.card.classList.remove("is-loading");
  elements.badge.textContent = "○";
  elements.status.textContent = "Athena analysis unavailable";
  elements.description.textContent =
    "Historical seismic analysis could not be loaded. Current earthquake and official alert information remain available.";
  elements.region.textContent = "Region unavailable";
  elements.updated.textContent = "Analysis date unavailable";
  setPlaceholderMetrics(elements);
}
