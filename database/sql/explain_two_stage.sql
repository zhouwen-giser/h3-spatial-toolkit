\set ON_ERROR_STOP on

-- Invoke with exactly one psql variable:
--   -v plan_h3=1  verifies the H3 coarse-candidate B-tree path.
--   -v plan_gist=1 verifies the exact PostGIS GiST path.
-- The probe row is selected through the primary key so the same statements
-- work for the 10K fixture and every strict scale fixture.
\if :{?plan_h3}
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
WITH probe AS MATERIALIZED (
  SELECT h3_cell
  FROM spatial_feature
  ORDER BY id
  LIMIT 1
)
SELECT feature.id
FROM spatial_feature AS feature
CROSS JOIN probe
WHERE feature.h3_cell = probe.h3_cell;
\elif :{?plan_gist}
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
WITH probe AS MATERIALIZED (
  SELECT ST_Expand(geom, 0.00001) AS geom
  FROM spatial_feature
  ORDER BY id
  LIMIT 1
)
SELECT feature.id
FROM spatial_feature AS feature
CROSS JOIN probe
WHERE feature.geom && probe.geom
  AND ST_Intersects(feature.geom, probe.geom);
\else
\echo 'Set plan_h3 or plan_gist when running explain_two_stage.sql'
\quit 2
\endif
