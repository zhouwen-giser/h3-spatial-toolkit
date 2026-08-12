\if :{?fixture_count}
\else
  \set fixture_count 100000
\endif

\timing on

TRUNCATE TABLE h3_metric, spatial_feature RESTART IDENTITY;

INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell, observed_at)
SELECT
  'certification-scale',
  jsonb_build_object('fixtureId', sequence),
  point,
  h3_latlng_to_cell(point, 9),
  timestamptz '2026-08-12 00:00:00+00' + (sequence || ' milliseconds')::interval
FROM generate_series(1, :fixture_count) AS sequence
CROSS JOIN LATERAL ST_SetSRID(
  ST_MakePoint(
    139.0 + ((sequence % 10000)::double precision / 10000),
    35.0 + (((sequence / 10000) % 10000)::double precision / 10000)
  ),
  4326
) AS point;

ANALYZE spatial_feature;

SELECT count(*) = :fixture_count::bigint AS fixture_ok FROM spatial_feature \gset
\if :fixture_ok
\else
  \echo 'Scale fixture row-count assertion failed'
  \quit 3
\endif

SELECT
  :fixture_count::bigint AS expected_rows,
  count(*) AS actual_rows,
  pg_database_size(current_database()) AS database_bytes
FROM spatial_feature;

SET enable_seqscan = off;

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id
FROM spatial_feature
WHERE h3_cell = (
  SELECT h3_cell FROM spatial_feature WHERE id = (:fixture_count::bigint / 2) LIMIT 1
);

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id
FROM spatial_feature
WHERE observed_at >= timestamptz '2026-08-12 00:00:01+00'
  AND observed_at < timestamptz '2026-08-12 00:00:02+00';

RESET enable_seqscan;
