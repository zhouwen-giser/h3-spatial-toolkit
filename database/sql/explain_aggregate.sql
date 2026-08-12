EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  h3_cell_to_parent(h3_cell, 7) AS cell,
  count(*) AS value,
  date_trunc('hour', observed_at) AS bucket_start
FROM spatial_feature
WHERE observed_at >= timestamptz '2026-08-12 00:00:00+00'
  AND observed_at < timestamptz '2026-08-13 00:00:00+00'
GROUP BY 1, 3;
