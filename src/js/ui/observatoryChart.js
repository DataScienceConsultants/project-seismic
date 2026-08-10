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
    modalClose: document.querySelector(".observatory-chart-modal-close")
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
    dateStyle: "medium",
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

function chartConfiguration(data, days, type) {
  const labels = data.points.map(point => readableDate(point.date, days));

  if (type === "anomaly") {
    const levels = data.points.map(point =>
      typeof point.anomaly_level === "string" ? point.anomaly_level : "Unavailable"
    );
    const options = addTooltipDates(chartOptions(days, context => [
      `Anomaly score: ${context.formattedValue}`,
      `Anomaly level: ${levels[context.dataIndex]}`
    ]), data.points);
    options.scales.y.max = 100;
    return {
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
      options
    };
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
  elements.modalSummary.textContent = CHART_COPY[expandedChartType].summary;
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

  expandedChart = new window.Chart(
    elements.modalCanvas,
    chartConfiguration(data, days, expandedChartType)
  );
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
  modalTrigger = trigger;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  elements.modal.hidden = false;
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
    elements.history?.classList.add("is-empty");
    elements.status.textContent = "No historical observations are available for this range.";
    elements.anomalySummary.textContent = "No anomaly score observations are available.";
    elements.eventSummary.textContent = "No earthquake activity observations are available.";
    if (modalIsOpen()) renderExpanded(data, days);
    return;
  }

  if (typeof window.Chart !== "function") throw new Error("Chart.js is unavailable");

  anomalyChart = new window.Chart(elements.anomalyCanvas, chartConfiguration(data, days, "anomaly"));
  eventChart = new window.Chart(elements.eventCanvas, chartConfiguration(data, days, "events"));
  latestChartData = data;
  latestChartDays = days;
  latestRangeLabel = rangeLabel;
  elements.anomalySummary.textContent = CHART_COPY.anomaly.summary;
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
  elements.history?.classList.add("is-empty");
  if (elements.status) elements.status.textContent = "Historical chart data is temporarily unavailable.";
  if (elements.modalStatus) elements.modalStatus.textContent = "Historical chart data is temporarily unavailable.";
  if (elements.anomalySummary) elements.anomalySummary.textContent = "Anomaly score history is unavailable.";
  if (elements.eventSummary) elements.eventSummary.textContent = "Earthquake activity history is unavailable.";
}
