import { ATHENA_API_BASE_URL } from "../config.js";

export async function fetchAthenaSummary() {
  const response = await fetch(
    `${ATHENA_API_BASE_URL}/summary`,
    { method: "GET" }
  );

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
