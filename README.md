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

Athena requests use a 10-second timeout and fail with calm, nontechnical UI
messages. Lightweight loading skeletons keep the Observatory structure visible
on its first load. When a different range is selected, the last successful
charts remain faintly visible under an updating overlay until the new data is
ready. If that refresh fails, the last successful historical view remains in
place; an empty range is identified without inventing zero values. The anomaly
score describes how unusual observed activity is relative to Athena's historical
baseline—it is not an earthquake probability or prediction.

Each historical chart can also be expanded into a reusable, accessible dialog.
The expanded view uses the already-loaded daily observations, keeps its range
controls synchronized with the inline Observatory, and does not aggregate,
smooth, or resample long-range data. It supports keyboard focus containment,
Escape/backdrop/close-button dismissal, and restores page focus and scrolling
when closed.

Anomaly visualization is adaptive without changing the source observations:
30D, 90D, and 1Y use the daily line view, while 5Y and 10Y use a daily bubble
scatter view for readability. The expanded anomaly chart also offers temporary
Adaptive, Line, and Scatter controls. Scatter point position is the original
anomaly score, a gently compressed square-root 1–5px point size reflects the
reported daily event count, and the text legend identifies anomaly levels
present in the response. Every valid
daily anomaly observation remains in Chart.js; no aggregation, smoothing,
resampling, or downsampling is performed.

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
- Switch ranges rapidly and confirm stale responses never replace the newest
  selection, duplicate requests are avoided, and the updating text is announced.
- Confirm null anomaly scores and event counts appear as gaps rather than zero.
- Simulate summary and chart failures independently and confirm either area can
  remain available when the other fails.
- Simulate empty chart points and request timeouts; confirm the empty message is
  shown and a failed refresh retains the last successful charts.
- Check 320px, 375px, 430px, tablet, and desktop widths, including a long region
  name and reduced-motion preference.
- Expand both chart types and verify their titles, descriptions, daily tooltips,
  and large desktop and full-screen mobile layouts.
- Close the expanded chart with its close button, Escape, and the backdrop;
  confirm focus returns to the triggering button and body scrolling is restored.
- Switch all five ranges from both inline and expanded controls and confirm they
  stay synchronized without duplicate requests or stale response overwrites.
- Confirm failed and empty expanded ranges retain or clear chart data as
  appropriate, and repeated opening never stacks Chart.js instances.
- Confirm inline 30D/90D/1Y anomaly views are lines and 5Y/10Y are scatter
  views, with one bubble for every daily point that has an anomaly score.
- In the expanded anomaly view, switch among Adaptive, Line, and Scatter and
  confirm the chart rerenders from memory without an Athena API request.
- Verify scatter radii stay bounded, actual anomaly levels appear in the text
  legend, and tooltips include date, score, level, event count, largest
  magnitude, and mean depth while null values remain unavailable.
