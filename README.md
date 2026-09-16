# Golf Caddie

Interactive golf shot planner and club recommender.

## Current target

The prototype is being upgraded around **Cog Hill Golf & Country Club — Course No. 4 (Dubsdread), Hole 18**.

The important architectural change is that map geometry and golf distance are separate concepts. SVG/screen pixels are only for drawing; real shot distance should come from latitude/longitude.

## Structure

- `golf_caddie.html` — current prototype UI
- `js/distance.js` — Haversine geographic distance and elevation helpers
- `js/caddie.js` — carry/total-distance and hazard-crossing recommendation logic
- `course_data/cog_hill_18.json` — course/hole metadata and geometry source
- `course_data/cog_hill_18_elevation.json` — elevation-data schema (left empty until real samples are sourced)

## Club model

The new caddie model distinguishes **carry** from **total** distance. This matters when a shot has to fly over water or a bunker. A safe landing point alone is not enough: the shot path must also be evaluated.

## Course geometry

Course geometry is sourced from OpenStreetMap-derived GeoJSON rather than fabricated SVG dimensions. It should be treated as map-quality geometry, not survey-grade data.

## Terrain

Elevation values are not fabricated. The elevation file is ready to accept sampled terrain heights from a real elevation dataset/API. Until those samples exist, the application should make no elevation adjustment.

## Next integration step

Refactor `golf_caddie.html` into `index.html`, `css/style.css`, `js/app.js`, and `js/map.js`, then render the GeoJSON course features while using `distance.js` for yardage and `caddie.js` for recommendations.
