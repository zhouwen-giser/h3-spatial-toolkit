BEGIN;

-- Keep resolution explicit for API/query contracts, but reject rows whose
-- value disagrees with the resolution encoded in the H3 index.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'h3_metric'::regclass
      AND conname = 'h3_metric_cell_resolution_check'
  ) THEN
    ALTER TABLE h3_metric
      ADD CONSTRAINT h3_metric_cell_resolution_check
      CHECK (h3_get_resolution(cell) = resolution) NOT VALID;
  END IF;
END
$migration$;

-- spatial_feature intentionally accepts generic Geometry rows. A polygon or
-- line can have an application-selected primary cell, so only Point rows have
-- an unambiguous geometry-to-cell invariant. The nested CASE also rejects an
-- empty Point without invoking the H3 conversion function on empty geometry.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'spatial_feature'::regclass
      AND conname = 'spatial_feature_point_h3_cell_check'
  ) THEN
    ALTER TABLE spatial_feature
      ADD CONSTRAINT spatial_feature_point_h3_cell_check
      CHECK (
        CASE
          WHEN ST_GeometryType(geom) <> 'ST_Point' THEN true
          WHEN ST_IsEmpty(geom) THEN false
          ELSE h3_cell = h3_latlng_to_cell(geom, h3_get_resolution(h3_cell))
        END
      ) NOT VALID;
  END IF;
END
$migration$;

-- NOT VALID keeps constraint installation brief; validation then proves all
-- pre-existing rows before this migration is committed.
ALTER TABLE h3_metric VALIDATE CONSTRAINT h3_metric_cell_resolution_check;
ALTER TABLE spatial_feature VALIDATE CONSTRAINT spatial_feature_point_h3_cell_check;

COMMIT;
