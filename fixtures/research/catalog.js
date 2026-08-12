// Deliberately small, clearly labeled UI fixture. Coordinates are illustrative and
// are not an authoritative fault or plate-boundary dataset.
export const fixtureCatalog = {
  meta: {
    fixture: true,
    source: "Athena Research interface fixture",
    dateRange: "2011-03-11–2024-04-03",
    updated: "Fixture build 2026-08-12",
    adequacy: "Demonstration only; incomplete global catalog",
    faults: "Illustrative fixture geometry — not for scientific use",
    boundaries: "Illustrative fixture geometry — boundary type unavailable"
  },
  earthquakes: [
    { id: "us6000m0xl", magnitude: 7.4, time: "2024-04-03T23:58:11Z", depth: 34.8, region: "Hualien, Taiwan", coordinates: [121.67, 23.82], athenaScore: null, sequenceId: "seq-hualien-2024", sequencePosition: 1 },
    { id: "official20110311054624120_30", magnitude: 9.1, time: "2011-03-11T05:46:24Z", depth: 29, region: "Near the east coast of Honshu, Japan", coordinates: [142.37, 38.30], athenaScore: null, sequenceId: null, sequencePosition: null },
    { id: "us7000jbyt", magnitude: 7.8, time: "2023-02-06T01:17:35Z", depth: 17.9, region: "Central Turkey", coordinates: [37.17, 37.23], athenaScore: null, sequenceId: "seq-turkey-2023", sequencePosition: 1 },
    { id: "us7000jbe3", magnitude: 7.5, time: "2023-02-06T10:24:49Z", depth: 10, region: "Central Turkey", coordinates: [37.20, 38.02], athenaScore: null, sequenceId: "seq-turkey-2023", sequencePosition: 2 }
  ],
  faults: [{ type: "Feature", geometry: { type: "LineString", coordinates: [[120.7,22.8],[121.1,23.5],[121.5,24.2],[121.9,24.8]] }, properties: { fault_id: "fixture-taiwan-01", fault_name: "Taiwan fault-system demo", fault_type: null, slip_rate: null, source: "Illustrative fixture geometry", source_id: null, tectonic_region: "Taiwan collision zone" } }],
  boundaries: [{ type: "Feature", geometry: { type: "LineString", coordinates: [[140,34],[142,38],[144,42]] }, properties: { boundary_id: "fixture-japan-01", plate_1: "Unavailable", plate_2: "Unavailable", boundary_type: null, source: "Illustrative fixture geometry" } }],
  sequences: [
    { id: "seq-turkey-2023", name: "Central Turkey fixture sequence", start: "2022-02-06", first: "2023-02-06T01:17:35Z", latest: "2023-02-06T10:24:49Z", status: "closed", events: ["us7000jbyt", "us7000jbe3"] },
    { id: "seq-hualien-2024", name: "Hualien fixture sequence", start: "2023-04-04", first: "2024-04-03T23:58:11Z", latest: "2024-04-03T23:58:11Z", status: "censored", events: ["us6000m0xl"] }
  ]
};
