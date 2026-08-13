function clearCanvas(canvas, context) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 900;
  const height = canvas.clientHeight || 180;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { width, height };
}

function drawGrid(context, width, height) {
  context.strokeStyle = "#20343a";
  context.lineWidth = 1;
  for (let y = 15; y < height; y += 25) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function bucketEvents(events, start, end, bucketCount, metric) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const span = endMs - startMs;
  if (!Number.isFinite(span) || span <= 0) return [];

  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    index,
    count: 0,
    maximumMagnitude: null
  }));

  events.forEach(event => {
    const time = Date.parse(event.time);
    if (!Number.isFinite(time) || time < startMs || time >= endMs) return;
    const position = Math.min(bucketCount - 1, Math.floor(((time - startMs) / span) * bucketCount));
    const bucket = buckets[position];
    bucket.count += 1;
    if (Number.isFinite(event.magnitude)) {
      bucket.maximumMagnitude = bucket.maximumMagnitude === null
        ? event.magnitude
        : Math.max(bucket.maximumMagnitude, event.magnitude);
    }
  });

  return buckets.map(bucket => metric === "count" ? bucket.count : bucket.maximumMagnitude);
}

function drawSeries(context, width, height, values, metric) {
  const finite = values.filter(value => Number.isFinite(value));
  if (!finite.length) return false;

  const min = metric === "count" ? 0 : Math.min(...finite) - 0.1;
  const max = Math.max(...finite, min + 1);
  const xStep = values.length > 1 ? width / (values.length - 1) : width;
  const yFor = value => height - 18 - ((value - min) / (max - min)) * (height - 36);

  context.strokeStyle = "#55d6c8";
  context.fillStyle = "#55d6c8";
  context.lineWidth = 1.5;
  context.globalAlpha = 0.85;
  context.beginPath();
  let started = false;

  values.forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    const x = index * xStep;
    const y = yFor(value);
    if (!started) {
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();

  values.forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    const x = index * xStep;
    const y = yFor(value);
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
  return true;
}

export function createResearchChart() {
  const canvas = document.querySelector("#researchChart");
  const context = canvas.getContext("2d");
  const metric = document.querySelector("#chartMetric");
  const note = document.querySelector("#chartNote");
  let lastState = null;
  let lastCatalog = null;

  function draw(state = lastState, catalog = lastCatalog) {
    lastState = state;
    lastCatalog = catalog;
    const { width, height } = clearCanvas(canvas, context);
    drawGrid(context, width, height);

    if (!state || !catalog) {
      note.textContent = "Observed research series unavailable.";
      return;
    }

    const selectedMetric = metric.value;
    if (selectedMetric === "anomaly") {
      note.textContent = "Unavailable · no prepared global Athena anomaly series is present in this frozen research bundle.";
      return;
    }
    if (selectedMetric === "energy") {
      note.textContent = "Unavailable · no prepared global energy series is present in this frozen research bundle.";
      return;
    }

    const rangeDays = state.range === "all" ? Infinity : Number(state.range);
    const bucketCount = rangeDays <= 365 ? 30 : 50;
    const values = bucketEvents(
      catalog.earthquakes,
      state.start,
      state.end,
      bucketCount,
      selectedMetric
    );
    const rendered = drawSeries(context, width, height, values, selectedMetric);
    if (!rendered) {
      note.textContent = "No observed M6+ events in the selected research window.";
      return;
    }

    const metricLabel = selectedMetric === "count" ? "observed event count" : "observed maximum magnitude";
    note.textContent = `${bucketCount} time buckets · ${metricLabel} · retrospective descriptive catalog data`;
  }

  metric.addEventListener("change", () => draw());
  return draw;
}
