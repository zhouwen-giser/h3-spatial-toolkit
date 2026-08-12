EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH query_area AS (
  SELECT ST_GeomFromText(
    'POLYGON((139.76 35.67,139.79 35.67,139.79 35.70,139.76 35.70,139.76 35.67))',
    4326
  ) AS geom
),
candidate_cells AS (
  SELECT h3_polygon_to_cells(geom, 9) AS cell FROM query_area
)
SELECT f.id
FROM spatial_feature f
JOIN candidate_cells c ON f.h3_cell = c.cell
CROSS JOIN query_area q
WHERE ST_Intersects(f.geom, q.geom);
