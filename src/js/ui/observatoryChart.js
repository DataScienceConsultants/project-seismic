let anomalyChart = null;
let eventChart = null;
let expandedChart = null;
let latestChartData = null;
let latestChartDays = 30;
let latestRangeLabel = "Last 30 days";
let selectedChartDays = 30;
let expandedChartType = null;
let modalTrigger = null;
let previousBodyOverflow = "";
let requestRange = null;
let expandedVisualization = "adaptive";

const SCATTER_MIN_DAYS = 1825;
const SCATTER_EXPLANATION = "Each point represents one day. Vertical position shows Athena anomaly score, point size reflects observed earthquake count, and category indicates Athena anomaly level.";
const LEVEL_COLORS = {
  typical: "rgba(104, 164, 137, 0.42)",
  noteworthy: "rgba(215, 181, 109, 0.46)",
  high: "rgba(207, 137, 91, 0.48)",
  extreme: "rgba(190, 91, 91, 0.5)"
};
const LEVEL_HOVER_COLORS = {
  typical: "rgba(104, 164, 137, 0.9)",
  noteworthy: "rgba(215, 181, 109, 0.92)",
  high: "rgba(207, 137, 91, 0.92)",
  extreme: "rgba(190, 91, 91, 0.94)"
};
const FALLBACK_LEVEL_COLOR = "rgba(166, 166, 173, 0.4)";
const FALLBACK_LEVEL_HOVER_COLOR = "rgba(166, 166, 173, 0.9)";

const CHART_COPY = {
  anomaly: {
    title: "Historical anomaly score",
    summary: "Daily anomaly scores compare observed activity with Athena’s historical baseline. Higher values indicate greater historical unusualness, not earthquake probability.",
    canvasLabel: "Expanded historical anomaly score chart"
  },
  events: {
    title: "Daily earthquake activity",
    summary: "Daily earthquake counts show observed event frequency for the selected period.",
    canvasLabel: "Expanded daily earthquake activity chart"
  }
};

function getElements() {
  return {
    anomalyCanvas: document.getElementById("observatoryAnomalyChart"),
    eventCanvas: document.getElementById("observatoryEventChart"),
    history: document.querySelector(".observatory-history"),
    rangeLabel: document.getElementById("observatoryChartRangeLabel"),
    status: document.getElementById("observatoryChartStatus"),
    anomalySummary: document.getElementById("observatoryAnomalySummary"),
    eventSummary: document.getElementById("observatoryEventSummary"),
    modal: document.getElementById("observatoryChartModal"),
    modalDialog: document.querySelector(".observatory-chart-modal-dialog"),
    modalTitle: document.getElementById("observatoryChartModalTitle"),
    modalCanvas: document.getElementById("observatoryExpandedChart"),
    modalCanvasWrap: document.querySelector(".observatory-chart-modal-canvas-wrap"),
    modalSummary: document.getElementById("observatoryChartModalSummary"),
    modalStatus: document.getElementById("observatoryChartModalStatus"),
    modalClose: document.querySelector(".observatory-chart-modal-close"),
    anomalyLegend: document.getElementById("observatoryAnomalyLegend"),
    modalLegend: document.getElementById("observatoryChartModalLegend"),
    visualizationControl: document.getElementById("observatoryVisualizationControl")
  };
}

function destroyInlineCharts() {
  anomalyChart?.destroy();
  eventChart?.destroy();
  anomalyChart = null;
  eventChart = null;
}

function destroyExpandedChart() {
  expandedChart?.destroy();
  expandedChart = null;
}

function finiteOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readableDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: days <= 90 ? "numeric" : undefined,
    year: days > 365 ? "2-digit" : undefined,
    timeZone: "UTC"
  }).format(date);
}

function tooltipDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeZone: "UTC"
  }).format(date);
}

function addTooltipDates(options, points) {
  options.plugins.tooltip.callbacks.title = items => {
    const point = points[items[0]?.dataIndex];
    return point ? tooltipDate(point.date) : "";
  };
  return options;
}

function humanizeLevel(value) {
  if (typeof value !== "string" || !value.trim()) return "Unavailable";
  const normalized = value.trim().replace(/[_-]+/g, " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function finiteValue(value) {
  if (typeof value === "boolean") return null;
  const number = Number(value);
  return value !== null && value !== "" && Number.isFinite(number) ? number : null;
}

function bubbleRadius(eventCount) {
  const count = finiteValue(eventCount);
  if (count === null) return 1;
  return Math.min(5, 1 + Math.log1p(Math.max(0, count)) / Math.log(10) * 0.7);
}

function resolvedAnomalyMode(days, mode = "adaptive") {
  return mode === "adaptive" ? (days >= SCATTER_MIN_DAYS ? "scatter" : "line") : mode;
}

function levelKey(value) {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : "unavailable";
}

function renderLevelLegend(element, levels, visible) {
  if (!element) return;
  element.replaceChildren();
  element.hidden = !visible;
  if (!visible) return;
  levels.forEach(level => {
    const item = document.createElement("span");
    const marker = document.createElement("i");
    marker.style.backgroundColor = LEVEL_COLORS[level] || FALLBACK_LEVEL_COLOR;
    marker.setAttribute("aria-hidden", "true");
    item.append(marker, humanizeLevel(level));
    element.append(item);
  });
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
        ticks: { color: "#a6a6ad", autoSkip: true, maxTicksLimit: days <= 90 ? 8 : 12 }
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.07)" },
        ticks: { color: "#a6a6ad" }
      }
    }
  };
}

function anomalyScatterConfiguration(data, days) {
  const groups = new Map();
  data.points.forEach(point => {
    const score = finiteValue(point.anomaly_score);
    const date = new Date(`${point.date}T00:00:00Z`).getTime();
    if (score === null || !Number.isFinite(date)) return;
    const level = levelKey(point.anomaly_level);
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level).push({
      x: date,
      y: score,
      r: bubbleRadius(point.event_count),
      source: point
    });
  });

  const options = chartOptions(days, context => {
    const point = context.raw.source;
    const score = finiteValue(point.anomaly_score);
    const eventCount = finiteValue(point.event_count);
    const magnitude = finiteValue(point.maximum_magnitude);
    const depth = finiteValue(point.mean_depth_km);
    return [
      `Anomaly score: ${score === null ? "--" : `${score.toFixed(1)} / 100`}`,
      `Anomaly level: ${humanizeLevel(point.anomaly_level)}`,
      `Earthquakes: ${eventCount === null ? "--" : eventCount.toLocaleString()}`,
      `Largest magnitude: ${magnitude === null ? "--" : `M ${magnitude.toFixed(1)}`}`,
      `Mean depth: ${depth === null ? "--" : `${depth.toFixed(1)} km`}`
    ];
  });
  options.animation.duration = 0;
  options.interaction = { mode: "nearest", intersect: false, axis: "xy" };
  options.plugins.tooltip.position = "nearest";
  options.plugins.tooltip.callbacks.title = items => {
    const point = items[0]?.raw?.source;
    return point ? tooltipDate(point.date) : "";
  };
  options.scales.x = {
    type: "linear",
    grid: { display: false },
    ticks: {
      color: "#a6a6ad",
      autoSkip: true,
      maxTicksLimit: days >= 3650 ? 10 : 12,
      callback: value => readableDate(new Date(value).toISOString().slice(0, 10), days)
    }
  };
  options.scales.y.max = 100;

  return {
    type: "bubble",
    data: { datasets: [...groups.entries()].map(([level, points]) => ({
      label: humanizeLevel(level),
      data: points,
      backgroundColor: LEVEL_COLORS[level] || FALLBACK_LEVEL_COLOR,
      hoverBackgroundColor: LEVEL_HOVER_COLORS[level] || FALLBACK_LEVEL_HOVER_COLOR,
      borderWidth: 0,
      hitRadius: 10,
      hoverRadius: context => (context.raw?.r || 1) + 2.5,
      hoverBorderWidth: 1.25,
      hoverBorderColor: "rgba(255, 255, 255, 0.82)"
    })) },
    options,
    levels: [...groups.keys()]
  };
}

function chartConfiguration(data, days, type, visualization = "adaptive") {
  const labels = data.points.map(point => readableDate(point.date, days));

  if (type === "anomaly") {
    if (resolvedAnomalyMode(days, visualization) === "scatter") {
      return anomalyScatterConfiguration(data, days);
    }
    const levels = data.points.map(point =>
      typeof point.anomaly_level === "string" ? point.anomaly_level : "Unavailable"
    );
    const options = addTooltipDates(chartOptions(days, context => [
      `Anomaly score: ${context.formattedValue}`,
      `Anomaly level: ${levels[context.dataIndex]}`
    ]), data.points);
    options.scales.y.max = 100;
    const configuration = {
      type: "line",
      data: { labels, datasets: [{
        label: "Anomaly score",
        data: data.points.map(point => finiteOrNull(point.anomaly_score)),
        borderColor: "#d7b56d",
        backgroundColor: "rgba(215, 181, 109, 0.12)",
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 8,
        spanGaps: false
      }] },
      options,
      levels: []
    };
    if (days >= SCATTER_MIN_DAYS) configuration.options.animation.duration = 0;
    return configuration;
  }

  return {
    type: "line",
    data: { labels, datasets: [{
      label: "Events per day",
      data: data.points.map(point => finiteOrNull(point.event_count)),
      borderColor: "#8ca7bd",
      backgroundColor: "rgba(140, 167, 189, 0.12)",
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      spanGaps: false
    }] },
    options: addTooltipDates(
      chartOptions(days, context => `Events per day: ${context.formattedValue}`),
      data.points
    )
  };
}

function createChart(canvas, configuration) {
  const { levels = [], ...chartConfigurationOptions } = configuration;
  return {
    chart: new window.Chart(canvas, chartConfigurationOptions),
    levels
  };
}

function modalIsOpen() {
  return !getElements().modal?.hidden;
}

function syncModalRanges(days) {
  document.querySelectorAll("[data-athena-modal-days]").forEach(button => {
    const selected = Number(button.dataset.athenaModalDays) === days;
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = selected && requestRange === days;
    button.setAttribute("aria-busy", String(selected && requestRange === days));
  });
}

function renderExpanded(data = latestChartData, days = latestChartDays) {
  const elements = getElements();
  if (!modalIsOpen() || !expandedChartType || !elements.modalCanvas) return;

  destroyExpandedChart();
  elements.modal.classList.remove("is-updating", "is-empty");
  elements.modalCanvasWrap.hidden = false;
  elements.modalTitle.textContent = CHART_COPY[expandedChartType].title;
  elements.visualizationControl.hidden = expandedChartType !== "anomaly";
  elements.modalSummary.textContent = CHART_COPY[expandedChartType].summary;
  renderLevelLegend(elements.modalLegend, [], false);
  elements.modalCanvas.setAttribute("aria-label", CHART_COPY[expandedChartType].canvasLabel);
  syncModalRanges(selectedChartDays);

  if (!data) {
    elements.modal.classList.add("is-empty");
    elements.modalCanvasWrap.hidden = true;
    elements.modalStatus.textContent = "Loading historical activity…";
    return;
  }

  if (data.points.length === 0) {
    elements.modal.classList.add("is-empty");
    elements.modalCanvasWrap.hidden = true;
    elements.modalStatus.textContent = "No historical observations are available for this range.";
    return;
  }

  const visualization = expandedChartType === "anomaly" ? expandedVisualization : "line";
  const result = createChart(
    elements.modalCanvas,
    chartConfiguration(data, days, expandedChartType, visualization)
  );
  expandedChart = result.chart;
  const scatter = expandedChartType === "anomaly" &&
    resolvedAnomalyMode(days, visualization) === "scatter";
  renderLevelLegend(elements.modalLegend, result.levels, scatter);
  elements.modalSummary.textContent = scatter
    ? `${SCATTER_EXPLANATION} ${CHART_COPY.anomaly.summary}`
    : CHART_COPY[expandedChartType].summary;
  elements.modalStatus.textContent = `${latestRangeLabel} historical activity loaded.`;
  window.requestAnimationFrame(() => expandedChart?.resize());
}

function closeExpandedChart() {
  const elements = getElements();
  if (!elements.modal || elements.modal.hidden) return;
  destroyExpandedChart();
  elements.modal.hidden = true;
  elements.modal.classList.remove("is-updating", "is-empty");
  document.body.style.overflow = previousBodyOverflow;
  const trigger = modalTrigger;
  modalTrigger = null;
  trigger?.focus();
}

function openExpandedChart(type, trigger) {
  const elements = getElements();
  if (!elements.modal || !CHART_COPY[type]) return;
  expandedChartType = type;
  expandedVisualization = "adaptive";
  modalTrigger = trigger;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  elements.modal.hidden = false;
  document.querySelectorAll("[data-athena-visualization]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.athenaVisualization === "adaptive"));
  });
  renderExpanded();
  elements.modalClose?.focus();
}

function trapModalFocus(event) {
  const { modalDialog } = getElements();
  if (event.key !== "Tab" || !modalDialog || !modalIsOpen()) return;
  const focusable = [...modalDialog.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function initializeObservatoryChartModal(loadRange) {
  const { modal } = getElements();
  if (!modal) return;

  document.querySelectorAll("[data-expand-athena-chart]").forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.expandAthenaChart;
      openExpandedChart(type, button);
      if (!latestChartData) loadRange(selectedChartDays);
    });
  });
  document.querySelectorAll("[data-athena-modal-days]").forEach(button => {
    button.addEventListener("click", () => loadRange(Number(button.dataset.athenaModalDays)));
  });
  document.querySelectorAll("[data-athena-visualization]").forEach(button => {
    button.addEventListener("click", () => {
      expandedVisualization = button.dataset.athenaVisualization;
      document.querySelectorAll("[data-athena-visualization]").forEach(control => {
        control.setAttribute("aria-pressed", String(control === button));
      });
      renderExpanded();
    });
  });
  modal.querySelectorAll("[data-chart-modal-close]").forEach(element => {
    element.addEventListener("click", closeExpandedChart);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modalIsOpen()) closeExpandedChart();
    else trapModalFocus(event);
  });
}

export function renderObservatoryChartsLoading(hasPreviousData = false, days = latestChartDays) {
  const { history, status, modal, modalStatus } = getElements();
  requestRange = days;
  selectedChartDays = days;
  history?.classList.toggle("is-initial-loading", !hasPreviousData);
  history?.classList.toggle("is-updating", hasPreviousData);
  if (status) status.textContent = hasPreviousData
    ? "Updating historical activity…"
    : "Loading historical activity…";
  syncModalRanges(days);
  if (modalIsOpen()) {
    modal?.classList.toggle("is-updating", Boolean(expandedChart));
    if (modalStatus) modalStatus.textContent = "Updating historical activity…";
  }
}

export function renderObservatoryCharts(data, days = 30, rangeLabel = "Last 30 days") {
  const elements = getElements();
  if (!elements.anomalyCanvas || !elements.eventCanvas || !elements.status) return;

  requestRange = null;
  selectedChartDays = days;
  destroyInlineCharts();
  elements.history?.classList.remove("is-initial-loading", "is-updating", "has-error", "is-empty");
  elements.rangeLabel.textContent = rangeLabel;
  syncModalRanges(days);

  if (data.points.length === 0) {
    latestChartData = data;
    latestChartDays = days;
    latestRangeLabel = rangeLabel;
    renderLevelLegend(elements.anomalyLegend, [], false);
    elements.history?.classList.add("is-empty");
    elements.status.textContent = "No historical observations are available for this range.";
    elements.anomalySummary.textContent = "No anomaly score observations are available.";
    elements.eventSummary.textContent = "No earthquake activity observations are available.";
    if (modalIsOpen()) renderExpanded(data, days);
    return;
  }

  if (typeof window.Chart !== "function") throw new Error("Chart.js is unavailable");

  const anomalyResult = createChart(
    elements.anomalyCanvas,
    chartConfiguration(data, days, "anomaly", "adaptive")
  );
  anomalyChart = anomalyResult.chart;
  eventChart = createChart(
    elements.eventCanvas,
    chartConfiguration(data, days, "events", "line")
  ).chart;
  const inlineScatter = resolvedAnomalyMode(days) === "scatter";
  renderLevelLegend(elements.anomalyLegend, anomalyResult.levels, inlineScatter);
  latestChartData = data;
  latestChartDays = days;
  latestRangeLabel = rangeLabel;
  elements.anomalySummary.textContent = inlineScatter
    ? `${SCATTER_EXPLANATION} ${CHART_COPY.anomaly.summary}`
    : CHART_COPY.anomaly.summary;
  elements.eventSummary.textContent = CHART_COPY.events.summary;
  elements.status.textContent = "Historical activity loaded.";
  if (modalIsOpen()) renderExpanded();
}

export function renderObservatoryChartsError(hasPreviousData = false) {
  const elements = getElements();
  requestRange = null;
  elements.history?.classList.remove("is-initial-loading", "is-updating");
  elements.history?.classList.add("has-error");
  elements.modal?.classList.remove("is-updating");
  syncModalRanges(selectedChartDays);
  if (hasPreviousData) {
    const message = "Couldn’t refresh this range. Showing the last available historical view.";
    if (elements.status) elements.status.textContent = message;
    if (modalIsOpen() && elements.modalStatus) elements.modalStatus.textContent = message;
    return;
  }
  destroyInlineCharts();
  destroyExpandedChart();
  renderLevelLegend(elements.anomalyLegend, [], false);
  renderLevelLegend(elements.modalLegend, [], false);
  elements.history?.classList.add("is-empty");
  if (elements.status) elements.status.textContent = "Historical chart data is temporarily unavailable.";
  if (elements.modalStatus) elements.modalStatus.textContent = "Historical chart data is temporarily unavailable.";
  if (elements.anomalySummary) elements.anomalySummary.textContent = "Anomaly score history is unavailable.";
  if (elements.eventSummary) elements.eventSummary.textContent = "Earthquake activity history is unavailable.";
}
