CREATE TABLE IF NOT EXISTS spatial_feature (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  feature_type text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  geom geometry(Geometry, 4326) NOT NULL,
  h3_cell h3index NOT NULL,
  observed_at timestamptz
);

CREATE INDEX IF NOT EXISTS spatial_feature_geom_gix ON spatial_feature USING gist (geom);
CREATE INDEX IF NOT EXISTS spatial_feature_h3_bix ON spatial_feature USING btree (h3_cell);
CREATE INDEX IF NOT EXISTS spatial_feature_observed_at_bix ON spatial_feature (observed_at);

CREATE TABLE IF NOT EXISTS h3_metric (
  cell h3index NOT NULL,
  resolution smallint NOT NULL CHECK (resolution BETWEEN 0 AND 15),
  metric text NOT NULL,
  value double precision NOT NULL,
  bucket_start timestamptz NOT NULL DEFAULT '-infinity',
  bucket text NOT NULL DEFAULT 'all',
  PRIMARY KEY (cell, metric, bucket, bucket_start)
);

CREATE INDEX IF NOT EXISTS h3_metric_parent_bix
  ON h3_metric ((h3_cell_to_parent(cell, 7)))
  WHERE resolution >= 7;
