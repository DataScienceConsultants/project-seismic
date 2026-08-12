const palette = { strong: "#e9ba67", major: "#ed8a61", great: "#ed725d" };

export function createResearchLayers(map, onSelect) {
  const groups = Object.fromEntries(["earthquakes", "faults", "boundaries", "anomalies", "sequences", "connections"].map(name => [name, L.layerGroup().addTo(map)]));

  function render(catalog) {
    Object.values(groups).forEach(group => group.clearLayers());
    catalog.earthquakes.forEach(event => {
      const tier = event.magnitude >= 8 ? "great" : event.magnitude >= 7 ? "major" : "strong";
      const marker = L.circleMarker([event.coordinates[1], event.coordinates[0]], { renderer: L.canvas(), radius: Math.min(10, 3 + (event.magnitude - 5) * 1.5), color: palette[tier], fillColor: palette[tier], fillOpacity: .65, weight: 1 });
      marker.bindTooltip(`M${event.magnitude.toFixed(1)} · ${event.region}`, { className: "research-tooltip" }).on("click", () => onSelect("earthquake", event)).addTo(groups.earthquakes);
      if (event.athenaScore != null) L.circleMarker([event.coordinates[1], event.coordinates[0]], { renderer: L.canvas(), radius: 13, color: "#a678dc", fillOpacity: 0, weight: 1 }).addTo(groups.anomalies);
    });
    L.geoJSON(catalog.faults, { style: { color: "#ed725d", weight: 2 }, onEachFeature: (feature, layer) => layer.bindTooltip(feature.properties.fault_name).on("click", () => onSelect("fault", feature.properties)) }).addTo(groups.faults);
    L.geoJSON(catalog.boundaries, { style: { color: "#669eea", weight: 2, dashArray: "5 5" }, onEachFeature: (feature, layer) => layer.bindTooltip("Plate boundary fixture").on("click", () => onSelect("boundary", feature.properties)) }).addTo(groups.boundaries);
    catalog.sequences.forEach(sequence => {
      const events = sequence.events.map(id => catalog.earthquakes.find(event => event.id === id)).filter(Boolean);
      if (!events.length) return;
      const points = events.map(event => [event.coordinates[1], event.coordinates[0]]);
      L.polyline(points.length > 1 ? points : [points[0], [points[0][0] + .01, points[0][1] + .01]], { color: "#e3ebea", weight: 1, opacity: .65, dashArray: "3 6" }).on("click", () => onSelect("sequence", { ...sequence, eventObjects: events })).addTo(groups.sequences);
    });
  }
  function toggle(name, visible) { if (!groups[name]) return; visible ? groups[name].addTo(map) : map.removeLayer(groups[name]); }
  function connections(enabled, catalog) {
    groups.connections.clearLayers();
    if (enabled && catalog.earthquakes[0] && catalog.faults[0]) {
      const event = catalog.earthquakes[0]; const faultPoint = catalog.faults[0].geometry.coordinates[1];
      L.polyline([[event.coordinates[1], event.coordinates[0]], [faultPoint[1], faultPoint[0]]], { color: "#55d6c8", weight: 1, opacity: .7, className: "connection-line" }).bindTooltip("spatially associated (fixture)").addTo(groups.connections);
    }
  }
  return { render, toggle, connections };
}
