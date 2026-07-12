import { fetchEarthquakes } from "./api/usgs.js";
import { createMap } from "./map/map.js";
import {
  renderEarthquakeMarkers,
  renderUserLocation
} from "./map/markers.js";
import { renderEarthquakeCards } from "./ui/cards.js";
import { getCurrentPosition } from "./services/geolocation.js";
import { formatTime } from "./utils/helpers.js";

const timeRange = document.getElementById("timeRange");
const magnitudeFilter = document.getElementById("magnitudeFilter");
const earthquakeList = document.getElementById("earthquakeList");
const totalEvents = document.getElementById("totalEvents");
const lastUpdated = document.getElementById("lastUpdated");
const statusSubtext = document.getElementById("statusSubtext");

let map;
let currentEarthquakes = [];

function filterEarthquakes() {
  const minMagnitude = Number(magnitudeFilter.value);

  return currentEarthquakes.filter(feature => {
    const magnitude = Number(feature.properties.mag);

    return Number.isFinite(magnitude) && magnitude >= minMagnitude;
  });
}

function render() {
  const filteredEarthquakes = filterEarthquakes();

  totalEvents.textContent = filteredEarthquakes.length;
  renderEarthquakeMarkers(map, filteredEarthquakes);
  renderEarthquakeCards(earthquakeList, filteredEarthquakes);

  console.log({
    loaded: currentEarthquakes.length,
    filtered: filteredEarthquakes.length,
    renderedCards: Math.min(filteredEarthquakes.length, 50)
  });
}

async function loadEarthquakes() {
  try {
    lastUpdated.textContent = "Updating...";

    const data = await fetchEarthquakes(timeRange.value);
    currentEarthquakes = Array.isArray(data.features)
      ? data.features
      : [];

    lastUpdated.textContent = `Updated ${formatTime(data.metadata.generated)}`;
    statusSubtext.textContent = "Live earthquake data loaded from USGS.";

    render();
  } catch (error) {
    console.error(error);
    statusSubtext.textContent = "Unable to load earthquake data.";
    lastUpdated.textContent = "Update failed";
  }
}

async function loadUserLocation() {
  try {
    const position = await getCurrentPosition();

    renderUserLocation(map, position);
  } catch (error) {
    console.warn("Location unavailable:", error.message);
  }
}

function initialize() {
  map = createMap();

  timeRange.addEventListener("change", loadEarthquakes);
  magnitudeFilter.addEventListener("change", render);

  loadEarthquakes();
  loadUserLocation();
}

initialize();
