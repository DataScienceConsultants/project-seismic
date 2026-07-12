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
let userCoordinates = null;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const toRadians = value => value * Math.PI / 180;

  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

function findClosestEarthquake(earthquakes) {
  if (!userCoordinates || earthquakes.length === 0) {
    return null;
  }

  return earthquakes.reduce((closest, earthquake) => {
    const coordinates = earthquake.geometry?.coordinates;

    if (!coordinates || coordinates.length < 2) {
      return closest;
    }

    const earthquakeLongitude = Number(coordinates[0]);
    const earthquakeLatitude = Number(coordinates[1]);

    if (
      !Number.isFinite(earthquakeLatitude) ||
      !Number.isFinite(earthquakeLongitude)
    ) {
      return closest;
    }

    const distance = calculateDistance(
      userCoordinates.latitude,
      userCoordinates.longitude,
      earthquakeLatitude,
      earthquakeLongitude
    );

    if (!closest || distance < closest.distance) {
      return {
        earthquake,
        distance
      };
    }

    return closest;
  }, null);
}

function filterEarthquakes() {
  const minMagnitude = Number(magnitudeFilter.value);

  return currentEarthquakes.filter(feature => {
    const magnitude = Number(feature.properties.mag);

    return Number.isFinite(magnitude) && magnitude >= minMagnitude;
  });
}

function render() {
  const filteredEarthquakes = filterEarthquakes();
  const closestResult = findClosestEarthquake(filteredEarthquakes);

  const closestEarthquakeId =
    closestResult?.earthquake?.id || null;

  totalEvents.textContent = filteredEarthquakes.length;

  renderEarthquakeMarkers(
    map,
    filteredEarthquakes,
    closestEarthquakeId
  );

  renderEarthquakeCards(
    earthquakeList,
    filteredEarthquakes
  );

  console.log({
    loaded: currentEarthquakes.length,
    filtered: filteredEarthquakes.length,
    closestDistance: closestResult?.distance ?? null,
    closestEarthquakeId
  });
}

async function loadEarthquakes() {
  try {
    lastUpdated.textContent = "Updating...";

    const data = await fetchEarthquakes(timeRange.value);

    currentEarthquakes = Array.isArray(data.features)
      ? data.features
      : [];

    lastUpdated.textContent =
      `Updated ${formatTime(data.metadata.generated)}`;

    statusSubtext.textContent =
      "Live earthquake data loaded from USGS.";

    render();
  } catch (error) {
    console.error(error);

    statusSubtext.textContent =
      "Unable to load earthquake data.";

    lastUpdated.textContent = "Update failed";
  }
}

async function loadUserLocation() {
  try {
    const position = await getCurrentPosition();

    userCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };

    renderUserLocation(map, position);

    if (currentEarthquakes.length > 0) {
      render();
    }
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
