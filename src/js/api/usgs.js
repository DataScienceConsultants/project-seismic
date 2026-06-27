import { USGS_FEEDS } from "../config.js";

export async function fetchEarthquakes(timeRange = "week") {
  const feedUrl = USGS_FEEDS[timeRange];

  if (!feedUrl) {
    throw new Error(`Unknown USGS feed: ${timeRange}`);
  }

  const response = await fetch(feedUrl);

  if (!response.ok) {
    throw new Error(`USGS request failed with status ${response.status}`);
  }

  return response.json();
}
