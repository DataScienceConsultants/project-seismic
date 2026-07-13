function getMagnitude(feature) {
  const magnitude =
    Number(feature?.properties?.mag);

  return Number.isFinite(magnitude)
    ? magnitude
    : null;
}

function getDepth(feature) {
  const depth =
    Number(
      feature?.geometry?.coordinates?.[2]
    );

  return Number.isFinite(depth)
    ? depth
    : null;
}

function getPlace(feature) {
  return (
    feature?.properties?.place ||
    "the reported epicenter"
  );
}

function getDistance(closestResult) {
  const distance =
    Number(closestResult?.distance);

  return Number.isFinite(distance)
    ? Math.round(distance)
    : null;
}

function getTsunamiType(tsunamiStatus) {
  return (
    tsunamiStatus?.type ||
    "unavailable"
  );
}

function getTsunamiGuidance(
  tsunamiStatus
) {
  const type =
    getTsunamiType(tsunamiStatus);

  const guidanceByType = {
    warning: {
      level: "red",
      headline:
        "Follow official emergency instructions now.",
      summary:
        "An official tsunami warning is active in the available warning-center feeds.",
      reminder:
        "If you are in an affected coastal area, follow evacuation and safety instructions from local authorities immediately."
    },

    advisory: {
      level: "orange",
      headline:
        "Stay away from beaches and coastal waters.",
      summary:
        "An official tsunami advisory is active in the available warning-center feeds.",
      reminder:
        "Follow instructions from local emergency management and remain alert for official updates."
    },

    watch: {
      level: "yellow",
      headline:
        "Stay informed and monitor official updates.",
      summary:
        "An official tsunami watch is active in the available warning-center feeds.",
      reminder:
        "A watch means conditions are being evaluated. Follow local guidance if the status changes."
    },

    threat: {
      level: "blue",
      headline:
        "Monitor official tsunami information.",
      summary:
        "A potential tsunami threat appears in the available warning-center feeds.",
      reminder:
        "Check official warning-center and local emergency-management updates for location-specific guidance."
    },

    clear: {
      level: "green",
      headline:
        "No tsunami-related action is currently indicated.",
      summary:
        "No active tsunami warning, advisory, watch, or threat appears in the available official feeds.",
      reminder:
        "Continue to follow local authorities if conditions or official guidance change."
    },

    unavailable: {
      level: "neutral",
      headline:
        "Official tsunami guidance is currently unavailable.",
      summary:
        "Project Seismic could not confirm the current tsunami alert status.",
      reminder:
        "Check your local emergency-management authority or official tsunami warning center directly."
    },

    information: {
      level: "blue",
      headline:
        "Review the official tsunami information.",
      summary:
        "An official tsunami information statement appears in the available warning-center feeds.",
      reminder:
        "Follow the source information and any instructions from local authorities."
    }
  };

  return (
    guidanceByType[type] ||
    guidanceByType.unavailable
  );
}

function getEarthquakeExplanation({
  magnitude,
  distance,
  depth,
  place
}) {
  if (
    magnitude === null ||
    distance === null
  ) {
    return {
      level: "neutral",
      summary:
        "Project Seismic could not calculate complete guidance for the nearest earthquake.",
      explanation:
        "Magnitude or location information is unavailable for this event."
    };
  }

  const eventSummary =
    `The closest listed earthquake was magnitude ${magnitude.toFixed(
      1
    )}, approximately ${distance} km from your location near ${place}.`;

  let depthContext = "";

  if (depth !== null) {
    depthContext =
      ` Its reported depth was ${depth.toFixed(
        1
      )} km.`;
  }

  if (
    magnitude >= 6.5 &&
    distance <= 150
  ) {
    return {
      level: "red",
      summary: eventSummary,
      explanation:
        `This is a major nearby earthquake.${depthContext} Check official emergency information and follow instructions from local authorities.`
    };
  }

  if (
    magnitude >= 5 &&
    distance <= 150
  ) {
    return {
      level: "orange",
      summary: eventSummary,
      explanation:
        `This is a strong earthquake within the wider area.${depthContext} Stay informed and review official local updates.`
    };
  }

  if (
    magnitude >= 4 &&
    distance <= 100
  ) {
    return {
      level: "yellow",
      summary: eventSummary,
      explanation:
        `This earthquake may have been noticeable near the epicenter.${depthContext} Monitor official information if you experienced shaking or are concerned about local conditions.`
    };
  }

  if (distance <= 100) {
    return {
      level: "green",
      summary: eventSummary,
      explanation:
        `This is a relatively small nearby event.${depthContext} The earthquake listing alone does not indicate that emergency action is required.`
    };
  }

  if (distance <= 300) {
    return {
      level: "green",
      summary: eventSummary,
      explanation:
        `The event occurred in your wider region.${depthContext} Continue to rely on official alerts for any safety instructions.`
    };
  }

  return {
    level: "green",
    summary: eventSummary,
    explanation:
      `The event occurred far from your current location.${depthContext} Project Seismic found no nearby-event condition based on distance alone.`
  };
}

function getOverallLevel(
  earthquakeLevel,
  tsunamiLevel
) {
  const priorities = {
    neutral: 0,
    green: 1,
    blue: 2,
    yellow: 3,
    orange: 4,
    red: 5
  };

  const earthquakePriority =
    priorities[earthquakeLevel] ?? 0;

  const tsunamiPriority =
    priorities[tsunamiLevel] ?? 0;

  return tsunamiPriority >=
    earthquakePriority
    ? tsunamiLevel
    : earthquakeLevel;
}

export function getRecommendation({
  closestResult,
  tsunamiStatus,
  hasUserLocation
}) {
  const tsunamiGuidance =
    getTsunamiGuidance(
      tsunamiStatus
    );

  if (!hasUserLocation) {
    return {
      level:
        tsunamiGuidance.level,

      headline:
        tsunamiGuidance.headline,

      summary:
        "Allow location access to receive personalized earthquake-distance guidance.",

      explanation:
        tsunamiGuidance.summary,

      officialReminder:
        tsunamiGuidance.reminder
    };
  }

  if (!closestResult?.earthquake) {
    return {
      level:
        tsunamiGuidance.level,

      headline:
        tsunamiGuidance.headline,

      summary:
        "No nearest earthquake could be calculated from the current filtered results.",

      explanation:
        tsunamiGuidance.summary,

      officialReminder:
        tsunamiGuidance.reminder
    };
  }

  const earthquake =
    closestResult.earthquake;

  const earthquakeGuidance =
    getEarthquakeExplanation({
      magnitude:
        getMagnitude(earthquake),

      distance:
        getDistance(
          closestResult
        ),

      depth:
        getDepth(earthquake),

      place:
        getPlace(earthquake)
    });

  const overallLevel =
    getOverallLevel(
      earthquakeGuidance.level,
      tsunamiGuidance.level
    );

  const tsunamiRequiresAttention =
    [
      "warning",
      "advisory",
      "watch",
      "threat",
      "information"
    ].includes(
      getTsunamiType(
        tsunamiStatus
      )
    );

  return {
    level: overallLevel,

    headline:
      tsunamiRequiresAttention
        ? tsunamiGuidance.headline
        : earthquakeGuidance.level ===
            "red"
          ? "Follow official emergency information."
          : earthquakeGuidance.level ===
              "orange"
            ? "Stay informed."
            : earthquakeGuidance.level ===
                "yellow"
              ? "Remain aware."
              : "No immediate action is indicated.",

    summary:
      earthquakeGuidance.summary,

    explanation:
      `${earthquakeGuidance.explanation} ${tsunamiGuidance.summary}`,

    officialReminder:
      tsunamiGuidance.reminder
  };
}
