TRUNCATE TABLE h3_metric, spatial_feature RESTART IDENTITY;

INSERT INTO spatial_feature (feature_type, properties, geom, h3_cell, observed_at)
SELECT
  'certification-point',
  jsonb_build_object('fixtureId', sequence),
  point,
  h3_latlng_to_cell(point, 9),
  timestamptz '2026-08-12 00:00:00+00' + (sequence || ' seconds')::interval
FROM generate_series(1, 10000) AS sequence
CROSS JOIN LATERAL ST_SetSRID(
  ST_MakePoint(
    139.74 + ((sequence % 100)::double precision / 1000),
    35.65 + ((sequence / 100)::double precision / 1000)
  ),
  4326
) AS point;

ANALYZE spatial_feature;

DO $$
DECLARE
  fixture_count bigint;
BEGIN
  SELECT count(*) INTO fixture_count FROM spatial_feature WHERE feature_type = 'certification-point';
  IF fixture_count <> 10000 THEN
    RAISE EXCEPTION 'Expected 10000 certification rows, got %', fixture_count;
  END IF;
END
$$;
