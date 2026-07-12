import { fetchEarthquakes } from "./api/usgs.js";
import { createMap } from "./map/map.js";

import {
  renderEarthquakeMarkers,
  renderUserLocation
} from "./map/markers.js";

import { renderEarthquakeCards } from "./ui/cards.js";
import { getCurrentPosition } from "./services/geolocation.js";
import { getStatus } from "./status/statusEngine.js";
import { formatTime } from "./utils/helpers.js";

const timeRange =
  document.getElementById("timeRange");

const magnitudeFilter =
  document.getElementById("magnitudeFilter");

const earthquakeList =
  document.getElementById("earthquakeList");

const statusCard =
  document.getElementById("statusCard");

const statusBadge =
  document.getElementById("statusBadge");

const statusHeadline =
  document.getElementById("statusHeadline");

const statusSubtext =
  document.getElementById("statusSubtext");

const nearestMagnitude =
  document.getElementById("nearestMagnitude");

const nearestDistance =
  document.getElementById("nearestDistance");

const nearestTime =
  document.getElementById("nearestTime");

const lastUpdated =
  document.getElementById("lastUpdated");

let map;
let currentEarthquakes = [];
let userCoordinates = null;

function calculateDistance(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadiusKm = 6371;
  const toRadians =
    value => value * Math.PI / 180;

  const latitudeDifference =
    toRadians(latitude2 - latitude1);

  const longitudeDifference =
    toRadians(longitude2 - longitude1);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

function findClosestEarthquake(earthquakes) {
  if (
    !userCoordinates ||
    earthquakes.length === 0
  ) {
    return null;
  }

  return earthquakes.reduce(
    (closest, earthquake) => {
      const coordinates =
        earthquake.geometry?.coordinates;

      if (
        !coordinates ||
        coordinates.length < 2
      ) {
        return closest;
      }

      const earthquakeLongitude =
        Number(coordinates[0]);

      const earthquakeLatitude =
        Number(coordinates[1]);

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

      if (
        !closest ||
        distance < closest.distance
      ) {
        return {
          earthquake,
          distance
        };
      }

      return closest;
    },
    null
  );
}

function filterEarthquakes() {
  const minimumMagnitude =
    Number(magnitudeFilter.value);

  return currentEarthquakes.filter(
    earthquake => {
      const magnitude =
        Number(earthquake.properties?.mag);

      return (
        Number.isFinite(magnitude) &&
        magnitude >= minimumMagnitude
      );
    }
  );
}

function updateStatusCard(
  closestResult,
  eventCount
) {
  const status = getStatus({
    closestResult,
    eventCount,
    hasUserLocation: Boolean(userCoordinates)
  });

  statusCard.dataset.status = status.level;
  statusBadge.textContent = status.badge;
  statusHeadline.textContent = status.title;
  statusSubtext.textContent = status.message;

  nearestMagnitude.textContent =
    status.magnitude === "--"
      ? "--"
      : `M ${status.magnitude}`;

  nearestDistance.textContent =
    status.distance;

  nearestTime.textContent =
    status.occurred;
}

function render() {
  const filteredEarthquakes =
    filterEarthquakes();

  const closestResult =
    findClosestEarthquake(
      filteredEarthquakes
    );

  const closestEarthquakeId =
    closestResult?.earthquake?.id || null;

  updateStatusCard(
    closestResult,
    filteredEarthquakes.length
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

async function loadEarthquakes() {
  try {
    lastUpdated.textContent = "Updating…";

    statusCard.dataset.status = "neutral";
    statusBadge.textContent = "○";

    statusHeadline.textContent =
      "Checking current activity…";

    statusSubtext.textContent =
      "Loading earthquake data and determining what is closest to you.";

    const data =
      await fetchEarthquakes(
        timeRange.value
      );

    currentEarthquakes =
      Array.isArray(data.features)
        ? data.features
        : [];

    lastUpdated.textContent =
      `Updated ${formatTime(
        data.metadata.generated
      )}`;

    render();
  } catch (error) {
    console.error(error);

    currentEarthquakes = [];

    statusCard.dataset.status = "neutral";
    statusBadge.textContent = "○";

    statusHeadline.textContent =
      "Earthquake data is unavailable";

    statusSubtext.textContent =
      "Project Seismic could not connect to the earthquake feed. Please try again later.";

    nearestMagnitude.textContent = "--";
    nearestDistance.textContent = "--";
    nearestTime.textContent = "--";

    lastUpdated.textContent =
      "Update failed";
  }
}

async function loadUserLocation() {
  try {
    const position =
      await getCurrentPosition();

    userCoordinates = {
      latitude:
        position.coords.latitude,
      longitude:
        position.coords.longitude
    };

    renderUserLocation(
      map,
      position
    );

    if (
      currentEarthquakes.length > 0
    ) {
      render();
    }
  } catch (error) {
    console.warn(
      "Location unavailable:",
      error.message
    );

    userCoordinates = null;

    if (
      currentEarthquakes.length > 0
    ) {
      render();
    }
  }
}

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
