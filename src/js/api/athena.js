import { ATHENA_API_BASE_URL } from "../config.js";

const ATHENA_TIMEOUT_MS = 10_000;

export class AthenaTimeoutError extends Error {
  constructor(resource) {
    super(`Athena ${resource} request timed out`);
    this.name = "AthenaTimeoutError";
  }
}

async function fetchWithTimeout(url, resource) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ATHENA_TIMEOUT_MS);

  try {
    return await fetch(url, { method: "GET", signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new AthenaTimeoutError(resource);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchAthenaSummary() {
  const response = await fetchWithTimeout(`${ATHENA_API_BASE_URL}/summary`, "summary");

  if (!response.ok) {
    throw new Error(
      `Athena summary request failed with status ${response.status}`
    );
  }

  const summary = await response.json();

  if (
    summary === null ||
    typeof summary !== "object" ||
    Array.isArray(summary)
  ) {
    throw new Error(
      "Athena summary response must be a JSON object"
    );
  }

  return summary;
}

export async function fetchAthenaChart(days) {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("Athena chart days must be a positive integer");
  }

  const response = await fetchWithTimeout(
    `${ATHENA_API_BASE_URL}/timeseries/chart?days=${days}`,
    "chart"
  );

  if (!response.ok) {
    throw new Error(
      `Athena chart request failed with status ${response.status}`
    );
  }

  const chart = await response.json();

  if (chart === null || typeof chart !== "object" || Array.isArray(chart)) {
    throw new Error("Athena chart response must be a JSON object");
  }

  if (!Array.isArray(chart.points)) {
    throw new Error("Athena chart response points must be an array");
  }

  return chart;
}
