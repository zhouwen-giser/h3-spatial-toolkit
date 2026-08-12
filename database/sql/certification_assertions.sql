\set ON_ERROR_STOP on

BEGIN;

DO $assertions$
DECLARE
  missing_constraints text;
BEGIN
  SELECT string_agg(required.name, ', ' ORDER BY required.name)
  INTO missing_constraints
  FROM (
    VALUES
      ('h3_metric'::regclass, 'h3_metric_cell_resolution_check'),
      ('spatial_feature'::regclass, 'spatial_feature_point_h3_cell_check')
  ) AS required(table_oid, name)
  LEFT JOIN pg_constraint AS actual
    ON actual.conrelid = required.table_oid
   AND actual.conname = required.name
   AND actual.convalidated
  WHERE actual.oid IS NULL;

  IF missing_constraints IS NOT NULL THEN
    RAISE EXCEPTION 'Required validated constraints are missing: %', missing_constraints;
  END IF;
END
$assertions$;

CREATE TEMP TABLE certification_context ON COMMIT DROP AS
WITH sample AS (
  SELECT '892f5a32d97ffff'::h3index AS cell
),
geometry AS (
  SELECT
    cell,
    h3_cell_to_geometry(cell) AS center,
    h3_cell_to_boundary_geometry(cell) AS boundary
  FROM sample
)
SELECT
  cell,
  center,
  ST_LineInterpolatePoint(
    ST_MakeLine(center, ST_PointN(ST_ExteriorRing(boundary), 1)),
    0.5
  ) AS same_cell_outside_point,
  ST_Buffer(center, 0.0001) AS query_area
FROM geometry;

DO $assertions$
DECLARE
  fixture_cell h3index;
  outside_cell h3index;
BEGIN
  SELECT
    h3_latlng_to_cell(same_cell_outside_point, h3_get_resolution(cell)),
    cell
  INTO outside_cell, fixture_cell
  FROM certification_context;

  IF outside_cell <> fixture_cell THEN
    RAISE EXCEPTION 'Two-stage fixture outside point unexpectedly left candidate cell';
  END IF;
END
$assertions$;

-- Positive invariants: a correctly indexed Point and a generic non-Point
-- Geometry are both valid. Non-Point rows deliberately retain an
-- application-selected primary cell rather than pretending one derivation is
-- universally correct.
INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell, observed_at)
SELECT
  'certification-invariant-positive',
  '{"case":"point"}'::jsonb,
  center,
  cell,
  timestamptz '2099-01-01 00:00:00+00'
FROM certification_context
UNION ALL
SELECT
  'certification-invariant-positive',
  '{"case":"generic-linestring"}'::jsonb,
  ST_MakeLine(center, same_cell_outside_point),
  h3_latlng_to_cell(ST_SetSRID(ST_MakePoint(0, 0), 4326), 9),
  timestamptz '2099-01-01 00:00:00+00'
FROM certification_context;

DO $assertions$
DECLARE
  inserted_count integer;
BEGIN
  SELECT count(*)
  INTO inserted_count
  FROM spatial_feature
  WHERE feature_type = 'certification-invariant-positive';

  IF inserted_count <> 2 THEN
    RAISE EXCEPTION 'Expected two positive invariant rows, got %', inserted_count;
  END IF;
END
$assertions$;

-- Negative invariant: a Point indexed to a different cell must be rejected by
-- the named check constraint.
DO $assertions$
DECLARE
  failed_constraint text;
BEGIN
  BEGIN
    INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell)
    SELECT
      'certification-invariant-negative',
      '{"case":"point-cell-mismatch"}'::jsonb,
      center,
      h3_latlng_to_cell(ST_SetSRID(ST_MakePoint(0, 0), 4326), 9)
    FROM certification_context;

    RAISE EXCEPTION 'Mismatched Point/H3 cell was accepted';
  EXCEPTION
    WHEN check_violation THEN
      GET STACKED DIAGNOSTICS failed_constraint = CONSTRAINT_NAME;
      IF failed_constraint <> 'spatial_feature_point_h3_cell_check' THEN
        RAISE;
      END IF;
  END;
END
$assertions$;

-- Negative invariant: an empty Point has no derivable H3 cell and must also be
-- rejected without causing the H3 conversion itself to fail.
DO $assertions$
DECLARE
  failed_constraint text;
BEGIN
  BEGIN
    INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell)
    SELECT
      'certification-invariant-negative',
      '{"case":"empty-point"}'::jsonb,
      ST_GeomFromText('POINT EMPTY', 4326),
      cell
    FROM certification_context;

    RAISE EXCEPTION 'Empty Point was accepted';
  EXCEPTION
    WHEN check_violation THEN
      GET STACKED DIAGNOSTICS failed_constraint = CONSTRAINT_NAME;
      IF failed_constraint <> 'spatial_feature_point_h3_cell_check' THEN
        RAISE;
      END IF;
  END;
END
$assertions$;

-- Negative invariant: the explicit metric resolution must match the H3 cell.
DO $assertions$
DECLARE
  failed_constraint text;
BEGIN
  BEGIN
    INSERT INTO h3_metric (cell, resolution, metric, value, bucket_start, bucket)
    SELECT cell, 8, 'certification-resolution-mismatch', 1, now(), 'all'
    FROM certification_context;

    RAISE EXCEPTION 'Mismatched metric Cell/Resolution was accepted';
  EXCEPTION
    WHEN check_violation THEN
      GET STACKED DIAGNOSTICS failed_constraint = CONSTRAINT_NAME;
      IF failed_constraint <> 'h3_metric_cell_resolution_check' THEN
        RAISE;
      END IF;
  END;
END
$assertions$;

-- Use an isolated future window so the executable aggregate statement has a
-- deterministic source count even when the 10K certification fixture exists.
DO $assertions$
DECLARE
  existing_count bigint;
BEGIN
  SELECT count(*)
  INTO existing_count
  FROM spatial_feature
  WHERE observed_at >= timestamptz '2099-02-01 00:00:00+00'
    AND observed_at < timestamptz '2099-02-01 01:00:00+00';

  IF existing_count <> 0 THEN
    RAISE EXCEPTION 'Aggregate certification window is not isolated: % rows', existing_count;
  END IF;
END
$assertions$;

INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell, observed_at)
SELECT
  'certification-aggregate',
  jsonb_build_object('sequence', sequence),
  center,
  cell,
  timestamptz '2099-02-01 00:10:00+00' + (sequence || ' minutes')::interval
FROM certification_context
CROSS JOIN generate_series(1, 2) AS sequence;

PREPARE certification_aggregate(smallint, text, text, timestamptz, timestamptz) AS
INSERT INTO h3_metric (cell, resolution, metric, value, bucket_start, bucket)
SELECT
  h3_cell_to_parent(h3_cell, $1) AS cell,
  $1 AS resolution,
  $2 AS metric,
  count(*)::double precision AS value,
  date_trunc($3, observed_at) AS bucket_start,
  $3 AS bucket
FROM spatial_feature
WHERE observed_at >= $4 AND observed_at < $5
GROUP BY 1, 5
ON CONFLICT (cell, metric, bucket, bucket_start)
DO UPDATE SET value = EXCLUDED.value;

-- Same cell/metric/start but a different bucket must coexist. This proves the
-- fourth key column participates in conflict identity.
INSERT INTO h3_metric (cell, resolution, metric, value, bucket_start, bucket)
SELECT
  h3_cell_to_parent(cell, 7),
  7,
  'certification-four-column-upsert',
  99,
  timestamptz '2099-02-01 00:00:00+00',
  'day'
FROM certification_context;

EXECUTE certification_aggregate(
  7,
  'certification-four-column-upsert',
  'hour',
  timestamptz '2099-02-01 00:00:00+00',
  timestamptz '2099-02-01 01:00:00+00'
);

-- Repeating the same aggregation is idempotent: it updates the hour row
-- rather than creating another row or accumulating its previous value.
EXECUTE certification_aggregate(
  7,
  'certification-four-column-upsert',
  'hour',
  timestamptz '2099-02-01 00:00:00+00',
  timestamptz '2099-02-01 01:00:00+00'
);

DO $assertions$
DECLARE
  metric_rows integer;
  hour_value double precision;
  day_value double precision;
BEGIN
  SELECT
    count(*),
    max(value) FILTER (WHERE bucket = 'hour'),
    max(value) FILTER (WHERE bucket = 'day')
  INTO metric_rows, hour_value, day_value
  FROM h3_metric
  WHERE metric = 'certification-four-column-upsert'
    AND bucket_start = timestamptz '2099-02-01 00:00:00+00';

  IF metric_rows <> 2 OR hour_value <> 2 OR day_value <> 99 THEN
    RAISE EXCEPTION
      'Four-column Upsert idempotency failed: rows=%, hour=%, day=%',
      metric_rows,
      hour_value,
      day_value;
  END IF;
END
$assertions$;

INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell, observed_at)
SELECT
  'certification-aggregate',
  '{"sequence":3}'::jsonb,
  center,
  cell,
  timestamptz '2099-02-01 00:30:00+00'
FROM certification_context;

EXECUTE certification_aggregate(
  7,
  'certification-four-column-upsert',
  'hour',
  timestamptz '2099-02-01 00:00:00+00',
  timestamptz '2099-02-01 01:00:00+00'
);

DO $assertions$
DECLARE
  metric_rows integer;
  hour_value double precision;
  day_value double precision;
BEGIN
  SELECT
    count(*),
    max(value) FILTER (WHERE bucket = 'hour'),
    max(value) FILTER (WHERE bucket = 'day')
  INTO metric_rows, hour_value, day_value
  FROM h3_metric
  WHERE metric = 'certification-four-column-upsert'
    AND bucket_start = timestamptz '2099-02-01 00:00:00+00';

  IF metric_rows <> 2 OR hour_value <> 3 OR day_value <> 99 THEN
    RAISE EXCEPTION
      'Four-column Upsert update failed: rows=%, hour=%, day=%',
      metric_rows,
      hour_value,
      day_value;
  END IF;
END
$assertions$;

-- Two rows share the same candidate H3 cell. Only the center is inside the
-- small query polygon, so the exact PostGIS stage must remove the coarse-stage
-- false positive.
CREATE TEMP TABLE certification_two_stage_ids (
  case_name text PRIMARY KEY,
  feature_id bigint NOT NULL
) ON COMMIT DROP;

WITH inserted AS (
  INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell, observed_at)
  SELECT
    'certification-two-stage',
    '{"case":"inside"}'::jsonb,
    center,
    cell,
    timestamptz '2099-03-01 00:00:00+00'
  FROM certification_context
  UNION ALL
  SELECT
    'certification-two-stage',
    '{"case":"outside"}'::jsonb,
    same_cell_outside_point,
    cell,
    timestamptz '2099-03-01 00:00:00+00'
  FROM certification_context
  RETURNING id, properties
)
INSERT INTO certification_two_stage_ids (case_name, feature_id)
SELECT properties ->> 'case', id
FROM inserted;

CREATE TEMP TABLE certification_two_stage_candidates ON COMMIT DROP AS
WITH candidate_cells AS (
  SELECT h3_polygon_to_cells(query_area, 9) AS cell
  FROM certification_context
)
SELECT f.id
FROM spatial_feature AS f
JOIN candidate_cells AS candidate ON f.h3_cell = candidate.cell;

CREATE TEMP TABLE certification_two_stage_results ON COMMIT DROP AS
WITH query_area AS (
  SELECT query_area AS geom
  FROM certification_context
),
candidate_cells AS (
  SELECT h3_polygon_to_cells(geom, 9) AS cell
  FROM query_area
)
SELECT f.id
FROM spatial_feature AS f
JOIN candidate_cells AS candidate ON f.h3_cell = candidate.cell
CROSS JOIN query_area AS query
WHERE ST_Intersects(f.geom, query.geom);

DO $assertions$
DECLARE
  candidate_case_count integer;
  exact_case_count integer;
  inside_returned boolean;
  outside_returned boolean;
BEGIN
  SELECT count(*)
  INTO candidate_case_count
  FROM certification_two_stage_ids AS expected
  JOIN certification_two_stage_candidates AS candidate
    ON candidate.id = expected.feature_id;

  SELECT
    count(*),
    bool_or(expected.case_name = 'inside'),
    bool_or(expected.case_name = 'outside')
  INTO exact_case_count, inside_returned, outside_returned
  FROM certification_two_stage_ids AS expected
  JOIN certification_two_stage_results AS result
    ON result.id = expected.feature_id;

  IF candidate_case_count <> 2
    OR exact_case_count <> 1
    OR inside_returned IS NOT TRUE
    OR outside_returned IS TRUE THEN
    RAISE EXCEPTION
      'Two-stage correctness failed: candidates=%, exact=%, inside=%, outside=%',
      candidate_case_count,
      exact_case_count,
      inside_returned,
      outside_returned;
  END IF;
END
$assertions$;

DEALLOCATE certification_aggregate;

SELECT
  'PASS' AS certification_assertions,
  3 AS negative_invariants_rejected,
  2 AS positive_geometry_cases,
  2 AS four_column_rows_after_upsert,
  1 AS two_stage_exact_rows;

ROLLBACK;
