const palette = { strong: "#e9ba67", major: "#ed8a61", great: "#ed725d" };

const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : null;

function faultLabel(feature) {
  return feature?.properties?.fault_name || "Mapped active fault";
}

function boundaryLabel(feature) {
  const properties = feature?.properties || {};
  const boundaryId = properties.boundary_id || "PB2002 boundary";
  const left = properties.left_plate;
  const right = properties.right_plate;
  const platePair = left && right ? `${left}–${right}` : left || right || null;
  const boundaryClass = properties.boundary_class || null;
  return [boundaryId, platePair, boundaryClass].filter(Boolean).join(" · ");
}

export function createResearchLayers(map, onSelect) {
  const groups = Object.fromEntries(
    ["earthquakes", "faults", "boundaries", "anomalies", "sequences", "connections"]
      .map(name => [name, L.layerGroup().addTo(map)])
  );
  const pathRenderer = L.canvas({ padding: 0.5, tolerance: 5 });

  function render(catalog) {
    Object.values(groups).forEach(group => group.clearLayers());

    catalog.earthquakes.forEach(event => {
      const magnitude = safeNumber(event.magnitude);
      if (magnitude === null || !Array.isArray(event.coordinates)) return;
      const tier = magnitude >= 8 ? "great" : magnitude >= 7 ? "major" : "strong";
      const marker = L.circleMarker(
        [event.coordinates[1], event.coordinates[0]],
        {
          renderer: pathRenderer,
          radius: Math.min(10, 3 + (magnitude - 5) * 1.5),
          color: palette[tier],
          fillColor: palette[tier],
          fillOpacity: 0.65,
          weight: 1
        }
      );
      marker
        .bindTooltip(`M${magnitude.toFixed(1)} · ${event.region}`, { className: "research-tooltip" })
        .on("click", () => onSelect("earthquake", event))
        .addTo(groups.earthquakes);

      if (event.athenaScore != null) {
        L.circleMarker(
          [event.coordinates[1], event.coordinates[0]],
          {
            renderer: pathRenderer,
            radius: 13,
            color: "#a678dc",
            fillOpacity: 0,
            weight: 1
          }
        ).addTo(groups.anomalies);
      }
    });

    if (catalog.faults.length) {
      L.geoJSON(catalog.faults, {
        style: {
          renderer: pathRenderer,
          color: "#ed725d",
          weight: 1,
          opacity: 0.55
        },
        onEachFeature: (feature, layer) => {
          layer
            .bindTooltip(faultLabel(feature), { className: "research-tooltip", sticky: true })
            .on("click", () => onSelect("fault", feature.properties || {}));
        }
      }).addTo(groups.faults);
    }

    if (catalog.boundaries.length) {
      L.geoJSON(catalog.boundaries, {
        style: {
          renderer: pathRenderer,
          color: "#669eea",
          weight: 1.5,
          opacity: 0.7,
          dashArray: "5 5"
        },
        onEachFeature: (feature, layer) => {
          layer
            .bindTooltip(boundaryLabel(feature), { className: "research-tooltip", sticky: true })
            .on("click", () => onSelect("boundary", feature.properties || {}));
        }
      }).addTo(groups.boundaries);
    }

    catalog.sequences.forEach(sequence => {
      const events = sequence.events
        .map(id => catalog.earthquakes.find(event => String(event.id) === String(id)))
        .filter(Boolean);
      if (!events.length) return;
      const points = events.map(event => [event.coordinates[1], event.coordinates[0]]);
      const displayPoints = points.length > 1
        ? points
        : [points[0], [points[0][0] + 0.01, points[0][1] + 0.01]];
      L.polyline(displayPoints, {
        renderer: pathRenderer,
        color: "#e3ebea",
        weight: 1,
        opacity: 0.65,
        dashArray: "3 6"
      })
        .on("click", () => onSelect("sequence", { ...sequence, eventObjects: events }))
        .addTo(groups.sequences);
    });
  }

  function toggle(name, visible) {
    if (!groups[name]) return;
    visible ? groups[name].addTo(map) : map.removeLayer(groups[name]);
  }

  function connections(enabled, catalog) {
    groups.connections.clearLayers();
    if (!enabled) return;

    catalog.earthquakes.forEach(event => {
      if (!event.nearestFault || !Array.isArray(event.coordinates)) return;
      const distance = safeNumber(event.nearestFault.distanceKm);
      const distanceLabel = distance === null ? "distance unavailable" : `${distance.toFixed(1)} km`;
      L.circleMarker(
        [event.coordinates[1], event.coordinates[0]],
        {
          renderer: pathRenderer,
          radius: 11,
          color: "#55d6c8",
          fillOpacity: 0,
          weight: 1,
          opacity: 0.75
        }
      )
        .bindTooltip(
          `${event.nearestFault.faultName} · ${distanceLabel} · geographic context only`,
          { className: "research-tooltip" }
        )
        .on("click", () => onSelect("earthquake", event))
        .addTo(groups.connections);
    });
  }

  return { render, toggle, connections };
}
