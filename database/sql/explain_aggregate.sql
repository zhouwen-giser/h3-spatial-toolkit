\set ON_ERROR_STOP on

-- Invoke with exactly one psql variable:
--   -v plan_time=1   verifies the observed_at B-tree range path.
--   -v plan_parent=1 verifies the partial parent-expression index path.
\if :{?plan_time}
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
WITH probe AS MATERIALIZED (
  SELECT observed_at
  FROM spatial_feature
  WHERE observed_at IS NOT NULL
  ORDER BY observed_at
  LIMIT 1
)
SELECT feature.id
FROM spatial_feature AS feature
CROSS JOIN probe
WHERE feature.observed_at >= probe.observed_at
  AND feature.observed_at < probe.observed_at + interval '1 millisecond';
\elif :{?plan_parent}
BEGIN;

-- A 10K transactional sample makes the parent lookup selective enough to
-- exercise the real expression index without leaving certification rows.
INSERT INTO h3_metric (cell, resolution, metric, value, bucket_start, bucket)
SELECT
  feature.h3_cell,
  h3_get_resolution(feature.h3_cell),
  'certification-parent-plan-' || feature.id,
  1,
  feature.observed_at,
  'raw'
FROM (
  SELECT id, h3_cell, observed_at
  FROM spatial_feature
  ORDER BY id
  LIMIT 10000
) AS feature;

ANALYZE h3_metric;

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
WITH probe AS MATERIALIZED (
  SELECT h3_cell_to_parent(cell, 7) AS parent_cell
  FROM h3_metric
  WHERE resolution >= 7
  ORDER BY cell, metric, bucket, bucket_start
  LIMIT 1
)
SELECT metric.cell
FROM h3_metric AS metric
CROSS JOIN probe
WHERE metric.resolution >= 7
  AND h3_cell_to_parent(metric.cell, 7) = probe.parent_cell;

ROLLBACK;
\else
\echo 'Set plan_time or plan_parent when running explain_aggregate.sql'
\quit 2
\endif
