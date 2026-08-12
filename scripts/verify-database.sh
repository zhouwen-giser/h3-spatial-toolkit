#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

# Git Bash rewrites Unix-looking arguments before invoking Windows executables.
# Suppress that conversion only for Docker so pnpm's own MSYS shim still works.
docker_cli() {
  if [[ -n "${MSYSTEM:-}" ]]; then
    MSYS_NO_PATHCONV=1 docker "$@"
  else
    docker "$@"
  fi
}
compose() {
  docker_cli compose "$@"
}

for command in docker git node pnpm sha256sum; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is unavailable: $command" >&2
    exit 2
  fi
done
if ! compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required" >&2
  exit 2
fi

evidence_root="${DATABASE_EVIDENCE_DIR:-output/acceptance/database}"
run_id="${DATABASE_CERTIFICATION_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
primary_db="h3toolkit"
database_user="h3"
postgres_host_port="${POSTGRES_HOST_PORT:-55432}"
test_database_url="postgresql://h3:h3@127.0.0.1:${postgres_host_port}/h3toolkit"
safe_run_id="${run_id//[^a-zA-Z0-9_]/_}"
safe_run_id="${safe_run_id:0:32}"
restore_db="${CERTIFICATION_RESTORE_DB:-h3toolkit_restore_${safe_run_id}}"
upgrade_db="${CERTIFICATION_UPGRADE_DB:-h3toolkit_upgrade_${safe_run_id}}"

if [[ "${ALLOW_DATABASE_CERTIFICATION_RESET:-}" != "YES" ]]; then
  echo "Refusing destructive certification reset; set ALLOW_DATABASE_CERTIFICATION_RESET=YES for a disposable local certification database" >&2
  exit 2
fi
if [[ -n "${POSTGRES_DB:-}${POSTGRES_USER:-}${TEST_DATABASE_URL:-}" ]]; then
  echo "POSTGRES_DB, POSTGRES_USER and TEST_DATABASE_URL overrides are unsupported by the fixed local certification Compose stack" >&2
  exit 2
fi

if [[ ! "$run_id" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "DATABASE_CERTIFICATION_RUN_ID must contain only letters, numbers, dot, underscore or hyphen" >&2
  exit 2
fi
for database in "$primary_db" "$restore_db" "$upgrade_db"; do
  if [[ ! "$database" =~ ^[a-zA-Z_][a-zA-Z0-9_]{0,62}$ ]]; then
    echo "Certification database names must be safe PostgreSQL identifiers" >&2
    exit 2
  fi
done
if [[ "$restore_db" == "$primary_db" ]]; then
  echo "CERTIFICATION_RESTORE_DB must differ from POSTGRES_DB" >&2
  exit 2
fi
if [[ "$upgrade_db" == "$primary_db" || "$upgrade_db" == "$restore_db" ]]; then
  echo "CERTIFICATION_UPGRADE_DB must differ from primary and restore databases" >&2
  exit 2
fi

run_dir="$evidence_root/runs/$run_id"
if [[ -e "$run_dir" ]]; then
  echo "Refusing to reuse non-empty certification evidence scope: $run_dir" >&2
  exit 2
fi
mkdir -p "$run_dir/plans"

tracked_changes="$(git status --porcelain=v1 --untracked-files=normal)"
if [[ -n "$tracked_changes" ]]; then
  echo "Refusing certification from a dirty tracked worktree; commit the exact certification implementation first" >&2
  printf '%s\n' "$tracked_changes" >&2
  exit 2
fi

psql_file() {
  local database="$1"
  local file="$2"
  compose exec -T postgres psql -X -U "$database_user" -d "$database" -v ON_ERROR_STOP=1 -P pager=off \
    -f /dev/stdin < "$file"
}

run_plan_probe() {
  local scale="$1"
  local sql_file="$2"
  local plan_variable="$3"
  local plan_name="$4"
  local required_index="$5"
  local relation="$6"
  local plan_dir="$run_dir/plans/$scale"
  local plan_path="$plan_dir/$plan_name-plan.json"
  mkdir -p "$plan_dir"
  compose exec -T postgres psql -X -qAt -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 \
    -P pager=off -v "$plan_variable=1" -f /dev/stdin < "$sql_file" > "$plan_path"
  node scripts/assert-database-evidence.mjs plan "$plan_path" "$required_index" "$relation" \
    | tee "$plan_dir/$plan_name-assertion.json"
}

run_plan_set() {
  local scale="$1"
  run_plan_probe "$scale" database/sql/explain_two_stage.sql plan_h3 h3 spatial_feature_h3_bix spatial_feature
  run_plan_probe "$scale" database/sql/explain_two_stage.sql plan_gist gist spatial_feature_geom_gix spatial_feature
  run_plan_probe "$scale" database/sql/explain_aggregate.sql plan_time time spatial_feature_observed_at_bix spatial_feature
  run_plan_probe "$scale" database/sql/explain_aggregate.sql plan_parent parent h3_metric_parent_bix h3_metric
}

logical_fingerprint() {
  local database="$1"
  compose exec -T postgres psql -X -qAt -U "$database_user" -d "$database" -v ON_ERROR_STOP=1 \
    -P pager=off -c "
WITH feature_hashes AS (
  SELECT hashtextextended(
    jsonb_build_array(
      id,
      feature_type,
      properties,
      encode(ST_AsEWKB(geom), 'hex'),
      h3_cell::text,
      CASE
        WHEN observed_at IS NULL THEN NULL
        ELSE to_char(observed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')
      END
    )::text,
    0
  ) AS row_hash
  FROM spatial_feature
),
feature_summary AS (
  SELECT
    count(*) AS row_count,
    coalesce(bit_xor(row_hash), 0)::text AS xor_hash,
    coalesce(sum(row_hash::numeric), 0)::text AS sum_hash
  FROM feature_hashes
),
metric_hashes AS (
  SELECT hashtextextended(
    jsonb_build_array(
      cell::text,
      resolution,
      metric,
      value::text,
      to_char(bucket_start AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),
      bucket
    )::text,
    0
  ) AS row_hash
  FROM h3_metric
),
metric_summary AS (
  SELECT
    count(*) AS row_count,
    coalesce(bit_xor(row_hash), 0)::text AS xor_hash,
    coalesce(sum(row_hash::numeric), 0)::text AS sum_hash
  FROM metric_hashes
)
SELECT json_build_object(
  'algorithm', 'postgres-hashtextextended-seed-0-xor-and-sum-v1',
  'spatial_feature', json_build_object(
    'count', feature_summary.row_count,
    'xor', feature_summary.xor_hash,
    'sum', feature_summary.sum_hash
  ),
  'h3_metric', json_build_object(
    'count', metric_summary.row_count,
    'xor', metric_summary.xor_hash,
    'sum', metric_summary.sum_hash
  )
)::text
FROM feature_summary
CROSS JOIN metric_summary;"
}

restore_created=false
restore_log="$run_dir/restore-rehearsal.log"
cleanup_restore() {
  if [[ "$restore_created" == true ]]; then
    compose exec -T postgres dropdb -U "$database_user" --if-exists "$restore_db" \
      >> "$restore_log" 2>&1 || true
  fi
}
trap cleanup_restore EXIT

{
  printf 'run_id=%s\n' "$run_id"
  printf 'executed_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'git_commit=%s\n' "$(git rev-parse HEAD)"
  printf 'node=%s\n' "$(node --version)"
  printf 'pnpm=%s\n' "$(pnpm --version)"
  printf 'docker=%s\n' "$(docker_cli version --format '{{.Client.Version}}/{{.Server.Version}}')"
  printf 'compose=%s\n' "$(compose version --short)"
  printf 'uname=%s\n' "$(uname -a)"
  printf 'git_tree=%s\n' "$(git rev-parse 'HEAD^{tree}')"
  printf 'git_status=clean-tracked\n'
} > "$run_dir/environment.txt" 2>&1

compose ps --format json > "$run_dir/compose-services.jsonl"
compose images postgres --format json > "$run_dir/compose-images.jsonl"
postgres_container="$(compose ps -q postgres)"
if [[ -z "$postgres_container" ]]; then
  echo "The postgres Compose service is not running" >&2
  exit 2
fi
postgres_health="$(docker_cli inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$postgres_container")"
if [[ "$postgres_health" != "healthy" ]]; then
  echo "The postgres Compose service is not healthy: $postgres_health" >&2
  exit 2
fi
expected_revision="$(git rev-parse HEAD)"
image_revision="$(docker_cli inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$postgres_container")"
if [[ "$image_revision" != "$expected_revision" ]]; then
  echo "Postgres image revision label $image_revision does not match certified source $expected_revision" >&2
  exit 2
fi
{
  printf 'service=postgres\n'
  printf 'container_id=%s\n' "$postgres_container"
  docker_cli inspect --format 'configured_image={{.Config.Image}}\nimage_id={{.Image}}\ncreated={{.Created}}\nhealth={{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$postgres_container"
  docker_cli image inspect --format 'repo_digests={{json .RepoDigests}}\nimage_created={{.Created}}' \
    "$(docker_cli inspect --format '{{.Image}}' "$postgres_container")"
} > "$run_dir/image-identity.txt"

compose exec -T postgres psql -X -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -P pager=off \
  -c "SELECT version(); SELECT postgis_full_version(); SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'h3', 'h3_postgis') ORDER BY extname;" \
  > "$run_dir/extension-versions.txt"

: > "$run_dir/migration.log"
for pass in 1 2; do
  for migration in database/migrations/*.sql; do
    printf 'migration_pass=%s file=%s\n' "$pass" "$migration" | tee -a "$run_dir/migration.log"
    psql_file "$primary_db" "$migration" 2>&1 | tee -a "$run_dir/migration.log"
  done
done

psql_file "$primary_db" database/sql/smoke_test.sql 2>&1 | tee "$run_dir/smoke-test.log"
psql_file "$primary_db" database/sql/certification_fixture.sql 2>&1 | tee "$run_dir/fixture-load.log"
psql_file "$primary_db" database/sql/certification_assertions.sql 2>&1 \
  | tee "$run_dir/certification-assertions.log"
run_plan_set 10000

TEST_DATABASE_URL="$test_database_url" pnpm test:integration 2>&1 \
  | tee "$run_dir/integration-test.log"
compose exec -T postgres psql -X -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -P pager=off \
  -v "certification_upgrade_db=$upgrade_db" -f /dev/stdin < database/sql/certification_extension_upgrade.sql 2>&1 \
  | tee "$run_dir/extension-upgrade.log"
psql_file "$primary_db" database/sql/certification_migration_rollback.sql 2>&1 \
  | tee "$run_dir/migration-rollback.log"

for scale in 100000 1000000 10000000; do
  compose exec -T postgres psql -X -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 \
    -P pager=off -v "fixture_count=$scale" -f /dev/stdin < database/sql/certification_scale.sql 2>&1 \
    | tee "$run_dir/scale-$scale.log"
  run_plan_set "$scale"
done

# Leave both certified tables non-empty so backup/restore parity proves actual
# logical data, not only empty-table schema restoration.
compose exec -T postgres psql -X -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -P pager=off \
  -c "
INSERT INTO h3_metric (cell, resolution, metric, value, bucket_start, bucket)
SELECT
  h3_cell_to_parent(h3_cell, 7),
  7,
  'certification-restore-hourly',
  count(*)::double precision,
  date_trunc('hour', observed_at),
  'hour'
FROM spatial_feature
WHERE observed_at >= timestamptz '2026-08-12 00:00:00+00'
  AND observed_at < timestamptz '2026-08-12 00:01:00+00'
GROUP BY 1, 5
ON CONFLICT (cell, metric, bucket, bucket_start)
DO UPDATE SET value = EXCLUDED.value;
SELECT count(*) AS persisted_metric_rows
FROM h3_metric
WHERE metric = 'certification-restore-hourly';" 2>&1 \
  | tee "$run_dir/backup-fixture.log"
persisted_metric_count="$(compose exec -T postgres psql -X -qAt -U "$database_user" -d "$primary_db" \
  -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM h3_metric WHERE metric = 'certification-restore-hourly'")"
persisted_metric_count="${persisted_metric_count//$'\r'/}"
if [[ ! "$persisted_metric_count" =~ ^[1-9][0-9]*$ ]]; then
  echo "Backup fixture did not persist any h3_metric rows" >&2
  exit 1
fi

logical_fingerprint "$primary_db" > "$run_dir/source-logical-fingerprint.json"
backup_name="$primary_db.dump"
backup_path="$run_dir/$backup_name"
compose exec -T postgres pg_dump -U "$database_user" -d "$primary_db" --format=custom > "$backup_path"
(
  cd "$run_dir"
  sha256sum "$backup_name" > backup-SHA256SUMS.txt
  sha256sum -c backup-SHA256SUMS.txt | tee backup-checksum-verification.log
)

: > "$restore_log"
if compose exec -T postgres psql -X -qAt -U "$database_user" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT 1 FROM pg_database WHERE datname = '$restore_db'" | grep -q 1; then
  echo "Refusing to overwrite pre-existing restore database: $restore_db" >&2
  exit 2
fi
compose exec -T postgres createdb -U "$database_user" "$restore_db" 2>&1 | tee -a "$restore_log"
restore_created=true
compose exec -T postgres pg_restore -U "$database_user" -d "$restore_db" --exit-on-error --verbose \
  < "$backup_path" 2>&1 | tee -a "$restore_log"
logical_fingerprint "$restore_db" > "$run_dir/restored-logical-fingerprint.json"
node scripts/assert-database-evidence.mjs parity \
  "$run_dir/source-logical-fingerprint.json" "$run_dir/restored-logical-fingerprint.json" \
  | tee "$run_dir/logical-parity.json"
compose exec -T postgres dropdb -U "$database_user" "$restore_db" 2>&1 | tee -a "$restore_log"
restore_created=false

node scripts/assert-database-evidence.mjs complete "$run_dir" "$evidence_root/latest.json" "$run_id" \
  | tee "$run_dir/completion.json"
echo "Database certification evidence written to $run_dir"
