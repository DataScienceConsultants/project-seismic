let anomalyChart = null;
let eventChart = null;

function getElements() {
  return {
    anomalyCanvas: document.getElementById("observatoryAnomalyChart"),
    eventCanvas: document.getElementById("observatoryEventChart"),
    history: document.querySelector(".observatory-history"),
    rangeLabel: document.getElementById("observatoryChartRangeLabel"),
    status: document.getElementById("observatoryChartStatus"),
    anomalySummary: document.getElementById("observatoryAnomalySummary"),
    eventSummary: document.getElementById("observatoryEventSummary")
  };
}

function destroyCharts() {
  anomalyChart?.destroy();
  eventChart?.destroy();
  anomalyChart = null;
  eventChart = null;
}

function finiteOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readableDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: days <= 90 ? "short" : "short",
    day: days <= 90 ? "numeric" : undefined,
    year: days > 365 ? "2-digit" : undefined,
    timeZone: "UTC"
  }).format(date);
}

function chartOptions(days, tooltipLabel) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: reducedMotion ? 0 : 250 },
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: tooltipLabel } }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#a6a6ad", autoSkip: true, maxTicksLimit: days <= 90 ? 8 : 10 }
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.07)" },
        ticks: { color: "#a6a6ad" }
      }
    }
  };
}

export function renderObservatoryChartsLoading(hasPreviousData = false) {
  const { history, status } = getElements();
  history?.classList.toggle("is-initial-loading", !hasPreviousData);
  history?.classList.toggle("is-updating", hasPreviousData);
  if (status) status.textContent = hasPreviousData
    ? "Updating historical activity…"
    : "Loading historical activity…";
}

export function renderObservatoryCharts(data, days = 30, rangeLabel = "Last 30 days") {
  const elements = getElements();
  if (!elements.anomalyCanvas || !elements.eventCanvas || !elements.status) return;

  destroyCharts();
  elements.history?.classList.remove("is-initial-loading", "is-updating", "has-error", "is-empty");
  elements.rangeLabel.textContent = rangeLabel;

  if (data.points.length === 0) {
    elements.history?.classList.add("is-empty");
    elements.status.textContent = "No historical observations are available for this range.";
    elements.anomalySummary.textContent = "No anomaly score observations are available.";
    elements.eventSummary.textContent = "No earthquake activity observations are available.";
    return;
  }

  if (typeof window.Chart !== "function") {
    throw new Error("Chart.js is unavailable");
  }

  const labels = data.points.map(point => readableDate(point.date, days));
  const anomalyLevels = data.points.map(point =>
    typeof point.anomaly_level === "string" ? point.anomaly_level : "Unavailable"
  );
  const anomalyScores = data.points.map(point => finiteOrNull(point.anomaly_score));
  const eventCounts = data.points.map(point => finiteOrNull(point.event_count));
  const anomalyOptions = chartOptions(days, context => {
    const level = anomalyLevels[context.dataIndex];
    return [`Score: ${context.formattedValue}`, `Anomaly level: ${level}`];
  });
  anomalyOptions.scales.y.max = 100;

  anomalyChart = new window.Chart(elements.anomalyCanvas, {
    type: "line",
    data: { labels, datasets: [{
      label: "Anomaly score",
      data: anomalyScores,
      borderColor: "#d7b56d",
      backgroundColor: "rgba(215, 181, 109, 0.12)",
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      spanGaps: false
    }] },
    options: anomalyOptions
  });

  eventChart = new window.Chart(elements.eventCanvas, {
    type: "line",
    data: { labels, datasets: [{
      label: "Events per day",
      data: eventCounts,
      borderColor: "#8ca7bd",
      backgroundColor: "rgba(140, 167, 189, 0.12)",
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      spanGaps: false
    }] },
    options: chartOptions(days, context => `Events per day: ${context.formattedValue}`)
  });

  elements.anomalySummary.textContent = "Daily anomaly scores compare observed activity with Athena’s historical baseline. Higher values indicate greater historical unusualness, not earthquake probability.";
  elements.eventSummary.textContent = "Daily earthquake counts show observed event frequency for the selected period.";
  elements.status.textContent = "Historical activity loaded.";
}

export function renderObservatoryChartsError(hasPreviousData = false) {
  const elements = getElements();
  elements.history?.classList.remove("is-initial-loading", "is-updating");
  elements.history?.classList.add("has-error");
  if (hasPreviousData) {
    if (elements.status) elements.status.textContent = "Couldn’t refresh this range. Showing the last available historical view.";
    return;
  }
  destroyCharts();
  elements.history?.classList.add("is-empty");
  if (elements.status) elements.status.textContent = "Historical chart data is temporarily unavailable.";
  if (elements.anomalySummary) elements.anomalySummary.textContent = "Anomaly score history is unavailable.";
  if (elements.eventSummary) elements.eventSummary.textContent = "Earthquake activity history is unavailable.";
}
