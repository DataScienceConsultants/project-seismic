import { loadResearchCatalog } from "./research-data.js";
import { createResearchMap } from "./research-map.js";
import { createPanel } from "./research-panel.js";
import { createTimeline } from "./research-timeline.js";
import { createResearchChart } from "./research-charts.js";
import { createWatchlist } from "./research-watchlist.js";

async function start() {
  const mapStatus = document.querySelector("#mapStatus");
  mapStatus.textContent = "Loading Athena research data…";

  let currentCatalog = await loadResearchCatalog();
  let currentMagnitude = 6;
  let currentWindow = null;
  let refreshVersion = 0;

  const panel = createPanel(currentCatalog.meta);
  const { map, layers } = createResearchMap(panel.select);
  const watchlist = createWatchlist();
  const drawChart = createResearchChart();
  layers.render(currentCatalog);

  function connectionsEnabled() {
    return document.querySelector("#connectionsToggle").getAttribute("aria-pressed") === "true";
  }

  function updateStatus(catalog) {
    const eventCount = catalog.earthquakes.length.toLocaleString();
    const total = Number(catalog.meta.catalogEventCount);
    const totalLabel = Number.isFinite(total) ? ` of ${total.toLocaleString()}` : "";
    mapStatus.textContent = `${eventCount}${totalLabel} observed events · M${currentMagnitude.toFixed(0)}+ · frozen ${catalog.meta.dateRange}`;
  }

  function setLayerAvailability() {
    const availability = currentCatalog.meta.availability || {};
    const rules = {
      boundaries: availability.plate_boundaries === true,
      sequences: availability.sequences === true,
      anomalies: currentCatalog.earthquakes.some(event => event.athenaScore != null)
    };

    Object.entries(rules).forEach(([layerName, available]) => {
      const input = document.querySelector(`[data-layer="${layerName}"]`);
      if (!input) return;
      input.disabled = !available;
      if (!available) {
        input.checked = false;
        layers.toggle(layerName, false);
        input.closest("label")?.setAttribute("title", "Unavailable in the prepared global research bundle");
      }
    });
  }

  async function refreshCatalog() {
    const version = ++refreshVersion;
    mapStatus.textContent = "Filtering observed Athena research data…";
    const catalog = await loadResearchCatalog({
      minimumMagnitude: currentMagnitude,
      start: currentWindow?.start,
      end: currentWindow?.end
    });
    if (version !== refreshVersion) return;

    currentCatalog = catalog;
    layers.render(catalog);
    if (connectionsEnabled()) layers.connections(true, catalog);
    updateStatus(catalog);
    if (currentWindow) drawChart(currentWindow, catalog);
  }

  document.querySelectorAll("[data-layer]").forEach(input => {
    input.addEventListener("change", () => layers.toggle(input.dataset.layer, input.checked));
  });

  document.querySelectorAll("[data-magnitude]").forEach(button => {
    button.addEventListener("click", async () => {
      currentMagnitude = Number(button.dataset.magnitude);
      document.querySelectorAll("[data-magnitude]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      await refreshCatalog();
    });
  });

  createTimeline(
    { start: currentCatalog.meta.startUtc, end: currentCatalog.meta.endUtc },
    async state => {
      currentWindow = state;
      await refreshCatalog();
      document.dispatchEvent(new CustomEvent("athena:timechange", { detail: state }));
    }
  );

  const connections = document.querySelector("#connectionsToggle");
  connections.addEventListener("click", () => {
    const enabled = connections.getAttribute("aria-pressed") !== "true";
    connections.setAttribute("aria-pressed", String(enabled));
    layers.connections(enabled, currentCatalog);
    layers.toggle("connections", enabled);
  });

  const togglePanel = visible => {
    document.querySelector("#researchPanel").classList.toggle("collapsed", !visible);
    document.querySelector("#panelToggle").setAttribute("aria-expanded", String(visible));
  };
  document.querySelector("#panelToggle").addEventListener("click", event => {
    togglePanel(event.currentTarget.getAttribute("aria-expanded") !== "true");
  });
  document.querySelector("#panelClose").addEventListener("click", () => togglePanel(false));

  document.querySelector("#pinSelection").addEventListener("click", () => {
    const selected = panel.getSelected();
    const label = selected.data.region || selected.data.fault_name || selected.data.name;
    if (label) watchlist.add(label);
  });

  document.querySelector("#researchSearch").addEventListener("input", event => {
    const query = event.target.value.trim().toLowerCase();
    if (query.length < 3) return;

    const earthquake = currentCatalog.earthquakes.find(item => (
      String(item.region || "").toLowerCase().includes(query)
    ));
    const fault = currentCatalog.faults.find(item => (
      String(item.properties?.fault_name || "").toLowerCase().includes(query)
    ));

    if (earthquake) {
      panel.select("earthquake", earthquake);
      map.setView([earthquake.coordinates[1], earthquake.coordinates[0]], 5);
    } else if (fault) {
      panel.select("fault", fault.properties || {});
      const layer = L.geoJSON(fault);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 6, padding: [30, 30] });
    }
  });

  setLayerAvailability();
  updateStatus(currentCatalog);
  window.addEventListener("resize", () => map.invalidateSize());
}

start().catch(error => {
  console.error("Athena Research failed to initialize", error);
  const status = document.querySelector("#mapStatus");
  if (status) status.textContent = "Athena research API unavailable";
});
