SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'h3', 'h3_postgis') ORDER BY extname;

WITH sample AS (
  SELECT h3_latlng_to_cell(ST_SetSRID(ST_MakePoint(139.7671, 35.6812), 4326), 9) AS cell
)
SELECT
  cell::text,
  h3_get_resolution(cell) AS resolution,
  ST_AsGeoJSON(h3_cell_to_boundary_geometry(cell))::json AS boundary
FROM sample;

SELECT count(*) > 0 AS polygon_cover_ok
FROM h3_polygon_to_cells(
  ST_GeomFromText('POLYGON((139.735 35.665,139.785 35.665,139.785 35.695,139.735 35.695,139.735 35.665))', 4326),
  9
);
