const TSUNAMI_FEEDS = [
  {
    provider: "National Tsunami Warning Center",
    url: "https://www.tsunami.gov/events/xml/PAAQCAP.xml"
  },
  {
    provider: "Pacific Tsunami Warning Center",
    url: "https://www.tsunami.gov/events/xml/PHEBCAP.xml"
  }
];

const ALERT_PRIORITY = {
  warning: 5,
  advisory: 4,
  watch: 3,
  threat: 2,
  information: 1,
  clear: 0,
  unavailable: -1
};

function getElementsByLocalName(parent, localName) {
  return Array.from(parent.getElementsByTagName("*"))
    .filter(element => element.localName === localName);
}

function getFirstText(parent, localName) {
  const element = getElementsByLocalName(parent, localName)[0];

  return element?.textContent?.trim() || "";
}

function getAllText(parent, localName) {
  return getElementsByLocalName(parent, localName)
    .map(element => element.textContent?.trim())
    .filter(Boolean);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function determineAlertType({
  event,
  headline,
  description
}) {
  const text = normalizeText(
    `${event} ${headline} ${description}`
  ).toLowerCase();

  if (
    text.includes("no tsunami warning") ||
    text.includes("no tsunami advisory") ||
    text.includes("no tsunami watch") ||
    text.includes("no tsunami threat")
  ) {
    return "clear";
  }

  if (text.includes("tsunami warning")) {
    return "warning";
  }

  if (text.includes("tsunami advisory")) {
    return "advisory";
  }

  if (text.includes("tsunami watch")) {
    return "watch";
  }

  if (
    text.includes("potential threat") ||
    text.includes("tsunami threat")
  ) {
    return "threat";
  }

  return "information";
}

function isOperationalAlert(alertElement) {
  const status =
    getFirstText(alertElement, "status").toLowerCase();

  const scope =
    getFirstText(alertElement, "scope").toLowerCase();

  const messageType =
    getFirstText(alertElement, "msgType").toLowerCase();

  const disallowedStatuses = [
    "test",
    "exercise",
    "draft"
  ];

  if (disallowedStatuses.includes(status)) {
    return false;
  }

  if (scope === "restricted") {
    return false;
  }

  if (messageType === "cancel") {
    return false;
  }

  return true;
}

function isExpired(expiresAt) {
  if (!expiresAt) {
    return false;
  }

  return expiresAt.getTime() <= Date.now();
}

function parseAlertElement(
  alertElement,
  provider
) {
  if (!isOperationalAlert(alertElement)) {
    return null;
  }

  const infoElements =
    getElementsByLocalName(
      alertElement,
      "info"
    );

  const englishInfo =
    infoElements.find(info => {
      const language =
        getFirstText(info, "language")
          .toLowerCase();

      return (
        !language ||
        language.startsWith("en")
      );
    }) || infoElements[0];

  if (!englishInfo) {
    return null;
  }

  const event =
    getFirstText(englishInfo, "event");

  const headline =
    getFirstText(englishInfo, "headline");

  const description =
    getFirstText(englishInfo, "description");

  const instruction =
    getFirstText(englishInfo, "instruction");

  const issuedAt =
    parseDate(
      getFirstText(alertElement, "sent") ||
      getFirstText(englishInfo, "effective") ||
      getFirstText(englishInfo, "onset")
    );

  const expiresAt =
    parseDate(
      getFirstText(englishInfo, "expires")
    );

  if (isExpired(expiresAt)) {
    return null;
  }

  const areas = getAllText(
    englishInfo,
    "areaDesc"
  );

  const type = determineAlertType({
    event,
    headline,
    description
  });

  return {
    id:
      getFirstText(alertElement, "identifier") ||
      `${provider}-${issuedAt?.getTime() || Date.now()}`,

    type,
    priority:
      ALERT_PRIORITY[type] ??
      ALERT_PRIORITY.information,

    title:
      headline ||
      event ||
      "Tsunami Information",

    event:
      event ||
      "Tsunami Information",

    message:
      description ||
      "Official tsunami information is available.",

    instruction:
      instruction || "",

    areas,

    issuedAt:
      issuedAt?.toISOString() || null,

    expiresAt:
      expiresAt?.toISOString() || null,

    provider,

    source:
      getFirstText(alertElement, "senderName") ||
      provider,

    web:
      getFirstText(englishInfo, "web") || "",

    severity:
      getFirstText(
        englishInfo,
        "severity"
      ) || "Unknown",

    urgency:
      getFirstText(
        englishInfo,
        "urgency"
      ) || "Unknown",

    certainty:
      getFirstText(
        englishInfo,
        "certainty"
      ) || "Unknown"
  };
}

function parseFeed(xmlText, provider) {
  const parser = new DOMParser();

  const document =
    parser.parseFromString(
      xmlText,
      "application/xml"
    );

  const parserError =
    document.querySelector("parsererror");

  if (parserError) {
    throw new Error(
      `Invalid XML returned by ${provider}.`
    );
  }

  const alertElements =
    getElementsByLocalName(
      document,
      "alert"
    );

  return alertElements
    .map(alert =>
      parseAlertElement(
        alert,
        provider
      )
    )
    .filter(Boolean);
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    method: "GET",
    headers: {
      Accept:
        "application/xml, text/xml;q=0.9, */*;q=0.8"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `${feed.provider} returned HTTP ${response.status}.`
    );
  }

  const xmlText = await response.text();

  return parseFeed(
    xmlText,
    feed.provider
  );
}

function sortAlerts(alerts) {
  return [...alerts].sort(
    (first, second) => {
      if (
        second.priority !==
        first.priority
      ) {
        return (
          second.priority -
          first.priority
        );
      }

      const firstIssued =
        first.issuedAt
          ? new Date(
              first.issuedAt
            ).getTime()
          : 0;

      const secondIssued =
        second.issuedAt
          ? new Date(
              second.issuedAt
            ).getTime()
          : 0;

      return (
        secondIssued -
        firstIssued
      );
    }
  );
}

function getDisplayState(alerts) {
  const actionableAlerts =
    alerts.filter(alert =>
      [
        "warning",
        "advisory",
        "watch",
        "threat"
      ].includes(alert.type)
    );

  if (actionableAlerts.length === 0) {
    return {
      level: "green",
      type: "clear",
      title: "No active tsunami alerts",
      message:
        "No tsunami warning, advisory, watch, or threat appears in the available official feeds.",
      alert: null
    };
  }

  const highestPriorityAlert =
    sortAlerts(actionableAlerts)[0];

  const displayByType = {
    warning: {
      level: "red",
      title: "Tsunami Warning"
    },

    advisory: {
      level: "orange",
      title: "Tsunami Advisory"
    },

    watch: {
      level: "yellow",
      title: "Tsunami Watch"
    },

    threat: {
      level: "blue",
      title: "Potential Tsunami Threat"
    }
  };

  const display =
    displayByType[
      highestPriorityAlert.type
    ];

  return {
    level: display.level,
    type:
      highestPriorityAlert.type,
    title: display.title,
    message:
      highestPriorityAlert.message,
    alert:
      highestPriorityAlert
  };
}

export async function fetchTsunamiStatus() {
  const checkedAt =
    new Date().toISOString();

  const results =
    await Promise.allSettled(
      TSUNAMI_FEEDS.map(fetchFeed)
    );

  const successfulResults =
    results.filter(
      result =>
        result.status === "fulfilled"
    );

  if (successfulResults.length === 0) {
    return {
      available: false,
      level: "neutral",
      type: "unavailable",
      title:
        "Official alert status unavailable",
      message:
        "Project Seismic could not reach the official tsunami feeds. Check your local emergency management authority for current information.",
      checkedAt,
      providers: [],
      alerts: [],
      alert: null
    };
  }

  const alerts =
    successfulResults.flatMap(
      result => result.value
    );

  const display =
    getDisplayState(alerts);

  const providers =
    TSUNAMI_FEEDS
      .filter((feed, index) =>
        results[index].status ===
        "fulfilled"
      )
      .map(feed => feed.provider);

  return {
    available: true,
    level: display.level,
    type: display.type,
    title: display.title,
    message: display.message,
    checkedAt,
    providers,
    alerts:
      sortAlerts(alerts),
    alert: display.alert
  };
}
