import { magnitudeClass } from "./research-data.js";

const unavailable = value => value === null || value === undefined || value === "" ? "Unavailable" : value;
const escapeHtml = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const display = value => escapeHtml(unavailable(value));
const metric = (label, value) => `<div class="metric"><span>${escapeHtml(label)}</span><b>${display(value)}</b></div>`;
const metrics = pairs => `<div class="metric-grid">${pairs.map(pair => metric(...pair)).join("")}</div>`;

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function formatNumber(value, digits = 0) {
  if (!hasValue(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: digits }) : null;
}

function formatDistance(value) {
  if (!hasValue(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)} km` : null;
}

export function createPanel(meta) {
  const panel = document.querySelector("#researchPanel");
  const title = document.querySelector("#panelTitle");
  const typeLabel = document.querySelector("#panelType");
  const content = document.querySelector("#panelContent");
  const provenance = document.querySelector("#provenanceContent");

  provenance.innerHTML = [
    ["Data source", meta.source],
    ["Date range", meta.dateRange],
    ["Last updated", meta.updated],
    ["Catalog adequacy", meta.adequacy],
    ["Fault source", meta.faults],
    ["Boundary source", meta.boundaries]
  ].map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${display(value)}</dd>`).join("");

  let selected = { type: "region", data: { name: "Global research view" } };

  function select(type, data) {
    selected = { type, data };
    typeLabel.textContent = type.toUpperCase();
    title.textContent = data.region || data.fault_name || data.name || data.boundary_id || "Research object";
    panel.classList.remove("collapsed");
    document.querySelector("#panelToggle").setAttribute("aria-expanded", "true");

    if (type === "earthquake") {
      const nearest = data.nearestFault;
      const associationCopy = nearest
        ? `Nearest mapped active-fault context: ${display(nearest.faultName)} at ${display(formatDistance(nearest.distanceKm))}. This is geographic context only and is not causal attribution.`
        : "No mapped active-fault association is available within the configured research distance. This must not be interpreted as no fault existing.";
      content.innerHTML = `
        <p class="summary-copy">Observed earthquake catalog record from the frozen global M6.0+ cohort.</p>
        ${metrics([
          ["Magnitude", Number.isFinite(data.magnitude) ? `M${data.magnitude.toFixed(1)}` : null],
          ["Magnitude class", magnitudeClass(data.magnitude)],
          ["Timestamp", data.time],
          ["Coordinates", Array.isArray(data.coordinates) ? `${Number(data.coordinates[1]).toFixed(2)}, ${Number(data.coordinates[0]).toFixed(2)}` : null],
          ["Depth", Number.isFinite(data.depth) ? `${data.depth.toFixed(1)} km` : null],
          ["Athena event-day score", data.athenaScore],
          ["Nearest mapped fault", nearest?.faultName],
          ["Distance to mapped fault", formatDistance(nearest?.distanceKm)],
          ["Plate-boundary context", null],
          ["Sequence ID", data.sequenceId],
          ["Sequence position", data.sequencePosition]
        ])}
        <p class="summary-copy">${associationCopy}</p>`;
      return;
    }

    if (type === "fault") {
      content.innerHTML = `
        <p class="summary-copy">Mapped active-fault geometry from the prepared GEM source. Display is for retrospective geographic context only.</p>
        ${metrics([
          ["Fault ID", data.fault_id],
          ["Tectonic region", data.tectonic_region],
          ["Fault type", data.fault_type],
          ["Slip rate", data.slip_rate],
          ["Source", data.source],
          ["Current Athena state", null],
          ["Current anomaly score", null],
          ["Recent energy trend", null],
          ["Active sequence", null]
        ])}
        <p class="summary-copy">Fault proximity does not establish earthquake causation or future probability.</p>`;
      return;
    }

    if (type === "sequence") {
      const counts = { STRONG: 0, MAJOR: 0, GREAT: 0 };
      (data.eventObjects || []).forEach(event => {
        const category = magnitudeClass(event.magnitude);
        if (counts[category] !== undefined) counts[category] += 1;
      });
      content.innerHTML = `
        <p class="summary-copy">Prepared retrospective sequence artifact. Sequence relationships are descriptive and nonpredictive.</p>
        ${metrics([
          ["Sequence start", data.start],
          ["First M6+", data.first],
          ["Qualifying events", data.events?.length],
          ["Strong / major / great", `${counts.STRONG} / ${counts.MAJOR} / ${counts.GREAT}`],
          ["Latest M6+", data.latest],
          ["Sequence status", data.status]
        ])}
        <h3>Qualifying events</h3>
        <ol>${(data.eventObjects || []).map(event => `<li>${display(event.time)} · M${Number(event.magnitude).toFixed(1)} ${display(magnitudeClass(event.magnitude))}</li>`).join("")}</ol>`;
      return;
    }

    if (type === "boundary") {
      content.innerHTML = `
        <p class="summary-copy">Boundary properties are reported only where supplied; boundary type is never inferred.</p>
        ${metrics([
          ["Plate 1", data.plate_1],
          ["Plate 2", data.plate_2],
          ["Boundary type", data.boundary_type],
          ["Source", data.source]
        ])}`;
      return;
    }

    content.innerHTML = `
      <p class="summary-copy">Frozen global M6.0+ research cohort. This view is retrospective, descriptive, and nonpredictive.</p>
      ${metrics([
        ["Catalog events", formatNumber(meta.catalogEventCount)],
        ["Minimum magnitude", meta.minimumMagnitude != null ? `M${Number(meta.minimumMagnitude).toFixed(1)}+` : null],
        ["Mapped fault traces", formatNumber(meta.faultGeometryFeatureCount)],
        ["Event-fault associations", formatNumber(meta.faultAssociationCount)],
        ["Current global Athena score", null],
        ["Prepared sequence series", meta.availability?.sequences ? "Available" : null],
        ["Prepared plate boundaries", meta.availability?.plate_boundaries ? "Available" : null]
      ])}
      <p class="summary-copy">${display(meta.faultAssociationSemantics)}</p>`;
  }

  select("region", selected.data);
  return { select, getSelected: () => selected };
}
