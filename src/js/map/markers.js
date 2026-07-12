let earthquakeLayer;
let userLocationMarker;
let userAccuracyCircle;

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

export function renderUserLocation(map, position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = position.coords.accuracy;
  const userLatLng = [latitude, longitude];

  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  if (userAccuracyCircle) {
    map.removeLayer(userAccuracyCircle);
  }

  userAccuracyCircle = L.circle(userLatLng, {
    radius: accuracy,
    color: "#4FA8FF",
    fillColor: "#4FA8FF",
    fillOpacity: 0.08,
    weight: 1
  }).addTo(map);

  userLocationMarker = L.circleMarker(userLatLng, {
  radius: 8,
  color: "#ffffff",
  weight: 3,
  fillColor: "#4FA8FF",
  fillOpacity: 1
})
  .bindPopup(`
    <div class="user-location-popup">
      <strong>You are here</strong>
    </div>
  `)
  .addTo(map);

  map.flyTo(userLatLng, Math.max(map.getZoom(), 7), {
    duration: 1.2
  });

  return userLatLng;
}

export function renderEarthquakeMarkers(
  map,
  earthquakes,
  closestEarthquakeId = null
  ) {
  
  if (earthquakeLayer) {
    map.removeLayer(earthquakeLayer);
  }

  earthquakeLayer = L.geoJSON(earthquakes, {
    pointToLayer(feature, latlng) {
  const magnitude = Number(feature.properties.mag) || 0;
  const isClosest = feature.id === closestEarthquakeId;

  if (isClosest) {
    return L.marker(latlng, {
      icon: L.divIcon({
        className: "closest-quake-marker",
        html: "⭐",
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    });
  }

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
      const depth = Number(feature.geometry.coordinates[2]) || 0;
      const eventTime = new Date(feature.properties.time);

      const formattedTime = eventTime.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });

      layer.bindPopup(`
        <div class="quake-popup">
          <div class="popup-mag">
            🌎 M ${magnitude.toFixed(1)}
          </div>

          <div class="popup-place">
            📍 ${place}
          </div>

          <div class="popup-time">
            🕒 ${formattedTime}
          </div>

          <div class="popup-depth">
            ↕ Depth: ${depth.toFixed(1)} km
          </div>
        </div>
      `);
    }
  }).addTo(map);

  return earthquakeLayer;
}
