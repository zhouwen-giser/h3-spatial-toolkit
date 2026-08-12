-- $1 = query GeoJSON; $2 = H3 resolution.
-- Phase 1 uses H3 as a coarse candidate key; Phase 2 uses PostGIS exact geometry.
WITH query_area AS (
  SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS geom
),
candidate_cells AS (
  SELECT h3_polygon_to_cells(geom, $2) AS cell FROM query_area
)
SELECT f.*
FROM spatial_feature f
JOIN candidate_cells c ON f.h3_cell = c.cell
CROSS JOIN query_area q
WHERE ST_Intersects(f.geom, q.geom);
