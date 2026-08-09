# EQ Tracker

EQ Tracker is a mobile-first earthquake awareness application designed to transform complex seismic information into calm, personalized guidance.

> We do not show earthquakes. We explain what they mean to you.

## Version

Current planning/build version: `0.1`

## Core Stack

- HTML
- CSS
- JavaScript
- Leaflet
- USGS Earthquake Feeds
- Progressive Web App technologies

## Development Goal

The first milestone is a mobile-first web application with personal earthquake status, a live map, geolocation, recent activity, and a clean design system.

## Athena Observatory

Project Seismic consumes Project Athena's production `/summary` endpoint to
provide historical, nonpredictive seismic context on the homepage. Athena
summarizes observed patterns and does not predict earthquakes or imminent
danger. Its data loads independently, so an Athena API failure does not disable
current earthquake information or tsunami alert features.

The Observatory also loads daily historical observations from
`/timeseries/chart?days=N`. It requests 30 days by default and offers 30D, 90D,
1Y, 5Y, and 10Y controls; longer ranges are fetched only when selected. The
anomaly score and event count charts are descriptive and nonpredictive. A chart
failure affects only the historical chart area and does not disable the Athena
summary or any other application feature.

### Manual verification

- Confirm the Observatory first displays its loading state, then renders the
  production `/summary` response with a NORMAL status, anomaly score, trend and
  strength, historical event count, region, and analysis date.
- Simulate an unavailable Athena endpoint and confirm only the Observatory
  changes to its error state.
- Confirm the earthquake list, tsunami card, map, and geolocation continue to
  work normally.
- Check that the Observatory layout remains readable at mobile viewport sizes.
- Switch among every historical range and confirm the active control and both
  charts update without reloading or stacking chart instances.
- Confirm null anomaly scores and event counts appear as gaps rather than zero.
- Simulate summary and chart failures independently and confirm either area can
  remain available when the other fails.
