import { fetchEarthquakes } from "./api/usgs.js";
import { createMap } from "./map/map.js";

import {
  renderEarthquakeMarkers,
  renderUserLocation
} from "./map/markers.js";

import { renderEarthquakeCards } from "./ui/cards.js";
import { getCurrentPosition } from "./services/geolocation.js";
import { fetchTsunamiStatus } from "./api/tsunami.js";
import { getStatus } from "./status/statusEngine.js";
import { formatTime } from "./utils/helpers.js";

/* =====================================================
   Earthquake Controls
===================================================== */

const timeRange =
  document.getElementById("timeRange");

const magnitudeFilter =
  document.getElementById("magnitudeFilter");

const earthquakeList =
  document.getElementById("earthquakeList");

/* =====================================================
   Current Status Card
===================================================== */

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

const totalEvents =
  document.getElementById("totalEvents");

const lastUpdated =
  document.getElementById("lastUpdated");

/* =====================================================
   Safety Alerts Card
===================================================== */

const safetyAlertCard =
  document.getElementById("safetyAlertCard");

const safetyAlertBadge =
  document.getElementById("safetyAlertBadge");

const safetyAlertTitle =
  document.getElementById("safetyAlertTitle");

const safetyAlertMessage =
  document.getElementById("safetyAlertMessage");

const safetyAlertMeta =
  document.getElementById("safetyAlertMeta");

const safetyAlertSource =
  document.getElementById("safetyAlertSource");

const safetyAlertLink =
  document.getElementById("safetyAlertLink");

/* =====================================================
   Application State
===================================================== */

let map;
let currentEarthquakes = [];
let userCoordinates = null;

const TSUNAMI_REFRESH_INTERVAL_MS =
  5 * 60 * 1000;

/* =====================================================
   Geographic Calculations
===================================================== */

function calculateDistance(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadiusKm = 6371;

  const toRadians = value =>
    value * Math.PI / 180;

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

      const distance =
        calculateDistance(
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

/* =====================================================
   Earthquake Filtering
===================================================== */

function filterEarthquakes() {
  const minimumMagnitude =
    Number(magnitudeFilter.value);

  return currentEarthquakes.filter(
    earthquake => {
      const magnitude =
        Number(
          earthquake.properties?.mag
        );

      return (
        Number.isFinite(magnitude) &&
        magnitude >= minimumMagnitude
      );
    }
  );
}

/* =====================================================
   Current Status Rendering
===================================================== */

function updateStatusCard(
  closestResult,
  eventCount
) {
  const status =
    getStatus({
      closestResult,
      eventCount,
      hasUserLocation:
        Boolean(userCoordinates)
    });

  statusCard.dataset.status =
    status.level;

  statusBadge.textContent =
    status.badge;

  statusHeadline.textContent =
    status.title;

  statusSubtext.textContent =
    status.message;

  nearestMagnitude.textContent =
    status.magnitude === "--"
      ? "--"
      : `M ${status.magnitude}`;

  nearestDistance.textContent =
    status.distance;

  totalEvents.textContent =
    eventCount.toLocaleString();
}

/* =====================================================
   Safety Alerts Rendering
===================================================== */

function getAlertBadge(type) {
  const badges = {
    warning: "🔴",
    advisory: "🟠",
    watch: "🟡",
    threat: "🌊",
    clear: "🟢",
    unavailable: "○",
    information: "ℹ️"
  };

  return badges[type] || "ℹ️";
}

function formatCheckedTime(timestamp) {
  const checkedTime =
    new Date(timestamp);

  if (
    Number.isNaN(
      checkedTime.getTime()
    )
  ) {
    return "Last checked time unavailable";
  }

  return `Last checked ${formatTime(
    checkedTime.getTime()
  )}`;
}

function getValidAlertUrl(value) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  const trimmedValue =
    value.trim();

  if (
    !/^https?:\/\//i.test(
      trimmedValue
    )
  ) {
    return "";
  }

  return trimmedValue;
}

function renderTsunamiStatus(status) {
  /*
   * The alert card is added in the next
   * index.html update. These checks prevent
   * app failure while files are updated
   * one at a time.
   */

  if (
    !safetyAlertCard ||
    !safetyAlertBadge ||
    !safetyAlertTitle ||
    !safetyAlertMessage ||
    !safetyAlertMeta ||
    !safetyAlertSource
  ) {
    return;
  }

  safetyAlertCard.dataset.status =
    status.level || "neutral";

  safetyAlertBadge.textContent =
    getAlertBadge(status.type);

  safetyAlertTitle.textContent =
    status.title ||
    "Official alert status unavailable";

  safetyAlertMessage.textContent =
    status.message ||
    "Official tsunami information could not be displayed.";

  safetyAlertMeta.textContent =
    formatCheckedTime(
      status.checkedAt
    );

  if (
    Array.isArray(status.providers) &&
    status.providers.length > 0
  ) {
    safetyAlertSource.textContent =
      `Sources: ${status.providers.join(", ")}`;
  } else {
    safetyAlertSource.textContent =
      "Source information unavailable";
  }

  const alertUrl =
    getValidAlertUrl(
      status.alert?.web
    );

  if (safetyAlertLink) {
    if (alertUrl) {
      safetyAlertLink.href =
        alertUrl;

      safetyAlertLink.hidden =
        false;
    } else {
      safetyAlertLink.removeAttribute(
        "href"
      );

      safetyAlertLink.hidden =
        true;
    }
  }
}

function renderTsunamiLoadingState() {
  if (
    !safetyAlertCard ||
    !safetyAlertBadge ||
    !safetyAlertTitle ||
    !safetyAlertMessage ||
    !safetyAlertMeta ||
    !safetyAlertSource
  ) {
    return;
  }

  safetyAlertCard.dataset.status =
    "neutral";

  safetyAlertBadge.textContent =
    "○";

  safetyAlertTitle.textContent =
    "Checking official alerts…";

  safetyAlertMessage.textContent =
    "Project Seismic is checking available official tsunami warning-center feeds.";

  safetyAlertMeta.textContent =
    "Updating…";

  safetyAlertSource.textContent =
    "Official sources";

  if (safetyAlertLink) {
    safetyAlertLink.hidden =
      true;
  }
}

/* =====================================================
   Main Earthquake Rendering
===================================================== */

function render() {
  const filteredEarthquakes =
    filterEarthquakes();

  const closestResult =
    findClosestEarthquake(
      filteredEarthquakes
    );

  const closestEarthquakeId =
    closestResult?.earthquake?.id ||
    null;

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
    loaded:
      currentEarthquakes.length,

    filtered:
      filteredEarthquakes.length,

    hasUserLocation:
      Boolean(userCoordinates),

    closestDistance:
      closestResult?.distance ??
      null,

    closestEarthquakeId
  });
}

/* =====================================================
   Earthquake Data Loading
===================================================== */

async function loadEarthquakes() {
  try {
    lastUpdated.textContent =
      "Updating…";

    statusCard.dataset.status =
      "neutral";

    statusBadge.textContent =
      "○";

    statusHeadline.textContent =
      "Checking current activity…";

    statusSubtext.textContent =
      "Loading earthquake data and determining what is closest to you.";

    nearestMagnitude.textContent =
      "--";

    nearestDistance.textContent =
      "--";

    totalEvents.textContent =
      "--";

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
    console.error(
      "Earthquake feed error:",
      error
    );

    currentEarthquakes = [];

    statusCard.dataset.status =
      "neutral";

    statusBadge.textContent =
      "○";

    statusHeadline.textContent =
      "Earthquake data is unavailable";

    statusSubtext.textContent =
      "Project Seismic could not connect to the earthquake feed. Please try again later.";

    nearestMagnitude.textContent =
      "--";

    nearestDistance.textContent =
      "--";

    totalEvents.textContent =
      "--";

    earthquakeList.innerHTML =
      "";

    lastUpdated.textContent =
      "Update failed";
  }
}

/* =====================================================
   Tsunami Alert Loading
===================================================== */

async function loadTsunamiStatus() {
  renderTsunamiLoadingState();

  try {
    const tsunamiStatus =
      await fetchTsunamiStatus();

    renderTsunamiStatus(
      tsunamiStatus
    );
  } catch (error) {
    console.error(
      "Tsunami alert error:",
      error
    );

    renderTsunamiStatus({
      available: false,
      level: "neutral",
      type: "unavailable",
      title:
        "Official alert status unavailable",
      message:
        "Project Seismic could not reach the available official tsunami feeds. Check your local emergency management authority for current information.",
      checkedAt:
        new Date().toISOString(),
      providers: [],
      alerts: [],
      alert: null
    });
  }
}

/* =====================================================
   User Location Loading
===================================================== */

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

/* =====================================================
   Initialization
===================================================== */

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
  loadTsunamiStatus();

  window.setInterval(
    loadTsunamiStatus,
    TSUNAMI_REFRESH_INTERVAL_MS
  );
}

initialize();
