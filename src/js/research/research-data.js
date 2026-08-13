import { ATHENA_API_BASE_URL } from "../config.js";

const API_BASE = ATHENA_API_BASE_URL.replace(/\/$/, "");
const EARTHQUAKE_PAGE_SIZE = 5000;

const endpoint = path => `${API_BASE}${path}`;

export const RESEARCH_ENDPOINTS = Object.freeze({
  summary: endpoint("/research/global/summary"),
  earthquakes: endpoint("/research/earthquakes"),
  faults: endpoint("/research/faults"),
  boundaries: endpoint("/research/plate-boundaries"),
  plateConnections: endpoint("/research/plate-connections"),
  region: region => endpoint(`/research/regions/${encodeURIComponent(region)}`),
  fault: id => endpoint(`/research/faults/${encodeURIComponent(id)}`),
  sequences: endpoint("/research/sequences"),
  sequence: id => endpoint(`/research/sequences/${encodeURIComponent(id)}`),
  connections: endpoint("/research/connections")
});

let datasetPromise = null;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Athena Research request failed (${response.status})`);
  }
  return response.json();
}

async function fetchAllEarthquakes() {
  const items = [];
  let offset = 0;

  while (true) {
    const url = new URL(RESEARCH_ENDPOINTS.earthquakes);
    url.searchParams.set("minimum_magnitude", "6");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(EARTHQUAKE_PAGE_SIZE));

    const page = await fetchJson(url);
    if (!Array.isArray(page.items)) {
      throw new Error("Athena Research earthquake response is invalid");
    }

    items.push(...page.items.map(normalizeEarthquake));
    if (!page.truncated || page.items.length === 0) break;
    offset += page.items.length;
  }

  return items;
}

function propertyValue(properties, names) {
  const entries = Object.entries(properties || {});
  for (const requested of names) {
    const match = entries.find(([key]) => key.toLowerCase() === requested.toLowerCase());
    if (match && match[1] !== null && match[1] !== "") return match[1];
  }
  return null;
}

function normalizeFault(feature, index, source) {
  const properties = { ...(feature.properties || {}) };
  const featureId = feature.id
    ?? propertyValue(properties, ["fault_id", "id", "fid", "objectid"])
    ?? `fault-${String(index + 1).padStart(6, "0")}`;
  const faultName = propertyValue(
    properties,
    ["name", "fault_name", "faultname", "fault_name_en"]
  );

  return {
    ...feature,
    properties: {
      ...properties,
      fault_id: String(featureId),
      fault_name: faultName ? String(faultName) : "Unnamed mapped active fault",
      fault_type: propertyValue(properties, ["fault_type", "faulttype"]),
      slip_rate: propertyValue(properties, ["slip_rate", "sliprate"]),
      tectonic_region: propertyValue(properties, ["tectonic_region", "region"]),
      source
    }
  };
}

function normalizeEarthquake(event) {
  return {
    ...event,
    magnitude: Number(event.magnitude),
    depth: event.depth === null ? null : Number(event.depth),
    athenaScore: event.athena_score ?? null,
    sequenceId: event.sequence_id ?? null,
    sequencePosition: event.sequence_position ?? null,
    nearestFault: null,
    nearestBoundary: null
  };
}

function normalizeSequence(sequence) {
  return {
    ...sequence,
    events: Array.isArray(sequence.events) ? sequence.events : []
  };
}

function findCitation(summary, sourceKey) {
  const citations = Array.isArray(summary.source_citations) ? summary.source_citations : [];
  return citations.find(item => item?.source_key === sourceKey) || null;
}

function buildMeta(summary) {
  const availability = summary.availability || {};
  const endDate = new Date(summary.end_utc);
  if (Number.isFinite(endDate.getTime())) endDate.setUTCMilliseconds(endDate.getUTCMilliseconds() - 1);

  const bird = findCitation(summary, "bird_pb2002");
  const birdCitation = bird?.citation?.formatted
    || "Bird, P. (2003). An updated digital model of plate boundaries. Geochemistry, Geophysics, Geosystems, 4, 1027. DOI 10.1029/2001GC000252.";

  return {
    fixture: false,
    source: summary.catalog_source || "USGS ComCat",
    dateRange: `${String(summary.start_utc || "").slice(0, 10)}–${Number.isFinite(endDate.getTime()) ? endDate.toISOString().slice(0, 10) : String(summary.end_utc || "").slice(0, 10)}`,
    startUtc: summary.start_utc,
    endUtc: summary.end_utc,
    updated: summary.generated_at_utc || "Unavailable",
    adequacy: "Frozen complete-calendar-year global M6.0+ research cohort; lower magnitudes are not represented.",
    faults: availability.fault_geometry
      ? `${summary.fault_source || "GEM Global Active Faults Database"} · geographic context only`
      : "Unavailable — no prepared active-fault geometry",
    boundaries: availability.plate_boundaries
      ? `${summary.plate_boundary_source || "Bird PB2002 plate boundary model"} · tectonic context only`
      : "Unavailable — no prepared plate-boundary artifact",
    boundaryCitation: birdCitation,
    boundaryLicense: bird?.distribution_license || null,
    reportIsNonpredictive: summary.report_is_nonpredictive === true,
    catalogEventCount: summary.catalog_event_count ?? null,
    minimumMagnitude: summary.minimum_magnitude ?? 6,
    faultAssociationCount: summary.event_fault_association_count ?? null,
    faultGeometryFeatureCount: summary.fault_geojson_feature_count ?? null,
    faultAssociationSemantics: summary.fault_association_semantics
      || "Nearest mapped active-fault geographic context; not causal attribution.",
    plateBoundaryFeatureCount: summary.plate_boundary_geojson_feature_count ?? null,
    plateBoundaryAssociationCount: summary.event_plate_boundary_association_count ?? null,
    plateBoundaryAssociationSemantics: summary.plate_boundary_association_semantics
      || "Nearest mapped PB2002 plate-boundary context; not causal attribution or future-earthquake probability.",
    availability
  };
}

async function loadDataset() {
  if (!datasetPromise) {
    datasetPromise = (async () => {
      const [
        summary,
        earthquakes,
        faultPayload,
        boundaryPayload,
        sequencePayload,
        connectionPayload,
        plateConnectionPayload
      ] = await Promise.all([
        fetchJson(RESEARCH_ENDPOINTS.summary),
        fetchAllEarthquakes(),
        fetchJson(RESEARCH_ENDPOINTS.faults),
        fetchJson(RESEARCH_ENDPOINTS.boundaries),
        fetchJson(RESEARCH_ENDPOINTS.sequences),
        fetchJson(RESEARCH_ENDPOINTS.connections),
        fetchJson(RESEARCH_ENDPOINTS.plateConnections)
      ]);

      if (summary.report_is_nonpredictive !== true) {
        throw new Error("Athena Research summary is missing its nonpredictive marker");
      }

      const faultSource = summary.fault_source || "GEM Global Active Faults Database";
      const boundarySource = summary.plate_boundary_source || "Bird PB2002 plate boundary model";
      const faults = Array.isArray(faultPayload.features)
        ? faultPayload.features.map((feature, index) => normalizeFault(feature, index, faultSource))
        : [];
      const boundaries = Array.isArray(boundaryPayload.features) ? boundaryPayload.features : [];
      const sequences = Array.isArray(sequencePayload.items)
        ? sequencePayload.items.map(normalizeSequence)
        : [];
      const connections = Array.isArray(connectionPayload.items) ? connectionPayload.items : [];
      const plateConnections = Array.isArray(plateConnectionPayload.items)
        ? plateConnectionPayload.items
        : [];

      const connectionByEvent = new Map(connections.map(item => [String(item.event_id), item]));
      const plateConnectionByEvent = new Map(
        plateConnections.map(item => [String(item.event_id), item])
      );
      earthquakes.forEach(event => {
        const association = connectionByEvent.get(String(event.id));
        if (association) {
          event.nearestFault = {
            faultId: association.fault_id,
            faultName: association.fault_name || "Unnamed mapped active fault",
            distanceKm: association.distance_km,
            source: association.fault_source || faultSource,
            relationship: association.relationship || "nearest_mapped_active_fault_context"
          };
        }

        const plateAssociation = plateConnectionByEvent.get(String(event.id));
        if (plateAssociation) {
          event.nearestBoundary = {
            stepId: plateAssociation.step_id,
            boundaryId: plateAssociation.boundary_id,
            leftPlate: plateAssociation.left_plate,
            rightPlate: plateAssociation.right_plate,
            boundaryClass: plateAssociation.boundary_class,
            polarity: plateAssociation.polarity,
            distanceKm: plateAssociation.distance_km,
            source: plateAssociation.source || boundarySource,
            relationship: plateAssociation.relationship || "nearest_mapped_plate_boundary_context"
          };
        }
      });

      return {
        meta: buildMeta(summary),
        summary,
        earthquakes,
        faults,
        boundaries,
        sequences,
        connections,
        plateConnections
      };
    })().catch(error => {
      datasetPromise = null;
      throw error;
    });
  }

  return datasetPromise;
}

function timeInWindow(time, start, end) {
  const timestamp = Date.parse(time);
  if (!Number.isFinite(timestamp)) return false;
  if (start && timestamp < Date.parse(start)) return false;
  if (end && timestamp >= Date.parse(end)) return false;
  return true;
}

function eventInBounds(event, bounds) {
  if (!bounds) return true;
  const [longitude, latitude] = event.coordinates || [];
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false;

  if (typeof bounds.contains === "function") {
    return bounds.contains([latitude, longitude]);
  }

  const south = bounds.south ?? bounds.minLatitude;
  const north = bounds.north ?? bounds.maxLatitude;
  const west = bounds.west ?? bounds.minLongitude;
  const east = bounds.east ?? bounds.maxLongitude;
  if ([south, north, west, east].some(value => !Number.isFinite(value))) return true;

  const latitudeMatches = latitude >= south && latitude <= north;
  const longitudeMatches = west <= east
    ? longitude >= west && longitude <= east
    : longitude >= west || longitude <= east;
  return latitudeMatches && longitudeMatches;
}

export async function loadResearchCatalog({
  bounds,
  start,
  end,
  minimumMagnitude = 6
} = {}) {
  const dataset = await loadDataset();
  const earthquakes = dataset.earthquakes.filter(event => (
    Number.isFinite(event.magnitude)
    && event.magnitude >= minimumMagnitude
    && timeInWindow(event.time, start, end)
    && eventInBounds(event, bounds)
  ));

  const visibleIds = new Set(earthquakes.map(event => String(event.id)));
  const sequences = dataset.sequences.filter(sequence => (
    sequence.events.some(id => visibleIds.has(String(id)))
  ));

  return {
    ...dataset,
    earthquakes,
    sequences,
    activeFilters: { start, end, minimumMagnitude }
  };
}

export function magnitudeClass(magnitude) {
  if (!Number.isFinite(magnitude)) return "Unavailable";
  if (magnitude >= 8) return "GREAT";
  if (magnitude >= 7) return "MAJOR";
  if (magnitude >= 6) return "STRONG";
  return "BELOW M6";
}
