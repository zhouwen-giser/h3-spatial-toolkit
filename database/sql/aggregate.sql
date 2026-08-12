-- H3 x time aggregation suitable for PostgreSQL-scale operational datasets.
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
