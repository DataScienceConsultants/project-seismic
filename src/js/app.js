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

const statusHeadline = document.getElementById("statusHeadline");
const statusSubtext = document.getElementById("statusSubtext");

const nearestMagnitude = document.getElementById("nearestMagnitude");
const nearestDistance = document.getElementById("nearestDistance");
const totalEvents = document.getElementById("totalEvents");

const lastUpdated = document.getElementById("lastUpdated");

let map;
let currentEarthquakes = [];
let userCoordinates = null;

/*
 * Calculates the distance between two coordinates
 * using the Haversine formula.
 */
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

/*
 * Finds the earthquake closest to the user's location.
 */
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

/*
 * Filters the earthquake feed using the selected
 * minimum magnitude.
 */
function filterEarthquakes() {
  const minMagnitude = Number(magnitudeFilter.value);

  return currentEarthquakes.filter(feature => {
    const magnitude = Number(feature.properties?.mag);

    return (
      Number.isFinite(magnitude) &&
      magnitude >= minMagnitude
    );
  });
}

/*
 * Updates the personalized status card.
 */
function updateStatusCard(filteredEarthquakes, closestResult) {
  totalEvents.textContent = filteredEarthquakes.length;

  if (filteredEarthquakes.length === 0) {
    nearestMagnitude.textContent = "--";
    nearestDistance.textContent = "--";

    statusHeadline.textContent =
      "No earthquakes match your filters";

    statusSubtext.textContent =
      "Try selecting a longer time range or a lower minimum magnitude.";

    return;
  }

  if (!userCoordinates) {
    nearestMagnitude.textContent = "--";
    nearestDistance.textContent = "--";

    statusHeadline.textContent =
      "Live earthquake activity loaded";

    statusSubtext.textContent =
      "Your location is unavailable, so distance and nearest-event information cannot be calculated.";

    return;
  }

  if (!closestResult) {
    nearestMagnitude.textContent = "--";
    nearestDistance.textContent = "--";

    statusHeadline.textContent =
      "Unable to determine the nearest earthquake";

    statusSubtext.textContent =
      "The earthquake feed loaded, but location information was incomplete.";

    return;
  }

  const magnitude =
    Number(closestResult.earthquake.properties?.mag) || 0;

  const distance = Math.round(closestResult.distance);
  const place =
    closestResult.earthquake.properties?.place ||
    "an unknown location";

  nearestMagnitude.textContent =
    `M ${magnitude.toFixed(1)}`;

  nearestDistance.textContent =
    `${distance} km`;

  if (distance <= 50 && magnitude >= 4.5) {
    statusHeadline.textContent =
      "Notable earthquake close to your location";
  } else if (distance <= 100) {
    statusHeadline.textContent =
      "Earthquake activity near your location";
  } else if (distance <= 300) {
    statusHeadline.textContent =
      "Earthquake activity in your wider region";
  } else {
    statusHeadline.textContent =
      "No nearby earthquakes in this view";
  }

  statusSubtext.textContent =
    `The closest listed event is magnitude ${magnitude.toFixed(1)}, approximately ${distance} km away near ${place}.`;
}

/*
 * Renders the map markers, earthquake cards,
 * totals, distance, and personalized status.
 */
function render() {
  const filteredEarthquakes = filterEarthquakes();
  const closestResult =
    findClosestEarthquake(filteredEarthquakes);

  const closestEarthquakeId =
    closestResult?.earthquake?.id || null;

  updateStatusCard(
    filteredEarthquakes,
    closestResult
  );

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
    closestDistance:
      closestResult?.distance ?? null,
    closestEarthquakeId
  });
}

/*
 * Loads current earthquake information from USGS.
 */
async function loadEarthquakes() {
  try {
    lastUpdated.textContent = "Updating…";

    statusHeadline.textContent =
      "Checking current activity…";

    statusSubtext.textContent =
      "Loading earthquake data and determining what is closest to you.";

    const data =
      await fetchEarthquakes(timeRange.value);

    currentEarthquakes =
      Array.isArray(data.features)
        ? data.features
        : [];

    lastUpdated.textContent =
      `Updated ${formatTime(data.metadata.generated)}`;

    render();
  } catch (error) {
    console.error(error);

    currentEarthquakes = [];

    statusHeadline.textContent =
      "Earthquake data is unavailable";

    statusSubtext.textContent =
      "Project Seismic could not connect to the earthquake feed. Please try again later.";

    nearestMagnitude.textContent = "--";
    nearestDistance.textContent = "--";
    totalEvents.textContent = "--";

    lastUpdated.textContent =
      "Update failed";
  }
}

/*
 * Requests the user's location and adds the
 * blue location marker to the map.
 */
async function loadUserLocation() {
  try {
    const position =
      await getCurrentPosition();

    userCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };

    renderUserLocation(map, position);

    if (currentEarthquakes.length > 0) {
      render();
    }
  } catch (error) {
    console.warn(
      "Location unavailable:",
      error.message
    );

    userCoordinates = null;

    if (currentEarthquakes.length > 0) {
      render();
    }
  }
}

/*
 * Starts the application.
 */
function initialize() {
  map = createMap();

  timeRange.addEventListener(
    "change",
    loadEarthquakes
  );

  magnitudeFilter.addEventListener(
    "change",
    render
  );

  loadEarthquakes();
  loadUserLocation();
}

initialize();
