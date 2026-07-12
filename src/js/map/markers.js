let earthquakeLayer;

export function getMagnitudeColor(magnitude) {
  if (magnitude >= 7) return "#FF5A5A";
  if (magnitude >= 6) return "#FF8A3D";
  if (magnitude >= 5) return "#F5B547";
  if (magnitude >= 3) return "#43C58A";
  return "#4FA8FF";
}

export function getMagnitudeRadius(magnitude) {
  return Math.max(450, magnitude * 520);
}

export function renderEarthquakeMarkers(map, earthquakes) {
  if (earthquakeLayer) {
    map.removeLayer(earthquakeLayer);
  }

  earthquakeLayer = L.geoJSON(earthquakes, {
    pointToLayer(feature, latlng) {
      const magnitude = Number(feature.properties.mag) || 0;

      return L.circle(latlng, {
        radius: getMagnitudeRadius(magnitude),
        fillColor: getMagnitudeColor(magnitude),
        fillOpacity: 0.75,
        color: getMagnitudeColor(magnitude),
        weight: 1.2
      });
    },

    onEachFeature(feature, layer) {
      const magnitude = Number(feature.properties.mag) || 0;
      const place = feature.properties.place || "Unknown location";

      layer.bindPopup(`
    <div class="quake-popup">
        <div class="popup-mag">
            M ${magnitude.toFixed(1)}
        </div>

        <div class="popup-place">
            📍 ${place}
        </div>

        <div class="popup-time">
            🕒 ${formattedTime}
        </div>
    </div>
`);
    }
  }).addTo(map);

  return earthquakeLayer;
}
