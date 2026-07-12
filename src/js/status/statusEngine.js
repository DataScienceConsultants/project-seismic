function formatRelativeTime(timestamp) {
  const eventTime = Number(timestamp);

  if (!Number.isFinite(eventTime)) {
    return "--";
  }

  const differenceMs = Date.now() - eventTime;
  const differenceMinutes = Math.max(
    0,
    Math.floor(differenceMs / 60000)
  );

  if (differenceMinutes < 1) {
    return "Just now";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes} min ago`;
  }

  const differenceHours = Math.floor(
    differenceMinutes / 60
  );

  if (differenceHours < 24) {
    return `${differenceHours} hr ago`;
  }

  const differenceDays = Math.floor(
    differenceHours / 24
  );

  return `${differenceDays} day${
    differenceDays === 1 ? "" : "s"
  } ago`;
}

export function getStatus({
  closestResult,
  eventCount,
  hasUserLocation
}) {
  if (eventCount === 0) {
    return {
      level: "neutral",
      badge: "○",
      title: "No earthquakes match your filters",
      message:
        "Try a longer time range or a lower minimum magnitude.",
      magnitude: "--",
      distance: "--",
      occurred: "--"
    };
  }

  if (!hasUserLocation) {
    return {
      level: "neutral",
      badge: "○",
      title: "Live earthquake activity loaded",
      message:
        "Allow location access to see which earthquake is closest to you.",
      magnitude: "--",
      distance: "--",
      occurred: "--"
    };
  }

  if (!closestResult?.earthquake) {
    return {
      level: "neutral",
      badge: "○",
      title: "Nearest earthquake unavailable",
      message:
        "The earthquake feed loaded, but the nearest event could not be calculated.",
      magnitude: "--",
      distance: "--",
      occurred: "--"
    };
  }

  const earthquake = closestResult.earthquake;
  const magnitude =
    Number(earthquake.properties?.mag) || 0;
  const distance = Math.round(closestResult.distance);
  const place =
    earthquake.properties?.place ||
    "an unspecified location";
  const occurred = formatRelativeTime(
    earthquake.properties?.time
  );

  const metrics = {
    magnitude: magnitude.toFixed(1),
    distance: `${distance} km`,
    occurred
  };

  if (magnitude >= 6.5 && distance <= 150) {
    return {
      level: "red",
      badge: "🔴",
      title: "Major earthquake nearby",
      message:
        `A magnitude ${magnitude.toFixed(1)} earthquake was reported approximately ${distance} km away near ${place}. Check official local updates.`,
      ...metrics
    };
  }

  if (magnitude >= 5 && distance <= 150) {
    return {
      level: "orange",
      badge: "🟠",
      title: "Strong earthquake nearby",
      message:
        `A magnitude ${magnitude.toFixed(1)} earthquake was reported approximately ${distance} km away near ${place}.`,
      ...metrics
    };
  }

  if (distance <= 100) {
    return {
      level: "yellow",
      badge: "🟡",
      title: "Nearby earthquake activity",
      message:
        `The closest listed earthquake was magnitude ${magnitude.toFixed(1)}, approximately ${distance} km away near ${place}.`,
      ...metrics
    };
  }

  return {
    level: "green",
    badge: "🟢",
    title: "Everything looks calm",
    message:
      `The closest listed earthquake was magnitude ${magnitude.toFixed(1)}, approximately ${distance} km away near ${place}.`,
    ...metrics
  };
}
