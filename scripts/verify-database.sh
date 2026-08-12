#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

for command in docker pnpm sha256sum; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is unavailable: $command" >&2
    exit 2
  fi
done
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required" >&2
  exit 2
fi

output_dir="${DATABASE_EVIDENCE_DIR:-output/acceptance/database}"
primary_db="${POSTGRES_DB:-h3toolkit}"
database_user="${POSTGRES_USER:-h3}"
test_database_url="${TEST_DATABASE_URL:-postgresql://h3:h3@localhost:5432/h3toolkit}"
restore_db="${CERTIFICATION_RESTORE_DB:-h3toolkit_restore}"
if [[ ! "$restore_db" =~ ^[a-zA-Z_][a-zA-Z0-9_]{0,62}$ ]] || [[ "$restore_db" == "$primary_db" ]]; then
  echo "CERTIFICATION_RESTORE_DB must be a safe identifier different from POSTGRES_DB" >&2
  exit 2
fi
mkdir -p "$output_dir"

docker compose ps --format json > "$output_dir/compose-services.json"
docker compose exec -T postgres psql -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 \
  -c "SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'h3', 'h3_postgis') ORDER BY extname" \
  > "$output_dir/extension-versions.txt"

for migration in database/migrations/*.sql; do
  docker compose exec -T postgres psql -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -f /dev/stdin < "$migration"
done
docker compose exec -T postgres psql -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -f /dev/stdin \
  < database/sql/smoke_test.sql | tee "$output_dir/smoke-test.log"
docker compose exec -T postgres psql -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -f /dev/stdin \
  < database/sql/certification_fixture.sql | tee "$output_dir/fixture-load.log"
docker compose exec -T postgres psql -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -f /dev/stdin \
  < database/sql/explain_two_stage.sql > "$output_dir/explain-two-stage.txt"
docker compose exec -T postgres psql -U "$database_user" -d "$primary_db" -v ON_ERROR_STOP=1 -f /dev/stdin \
  < database/sql/explain_aggregate.sql > "$output_dir/explain-aggregate.txt"

TEST_DATABASE_URL="$test_database_url" pnpm test:integration \
  | tee "$output_dir/integration-test.log"

backup_path="$output_dir/${primary_db}.dump"
docker compose exec -T postgres pg_dump -U "$database_user" -d "$primary_db" --format=custom > "$backup_path"
sha256sum "$backup_path" > "$output_dir/backup-SHA256SUMS.txt"
docker compose exec -T postgres dropdb -U "$database_user" --if-exists "$restore_db"
docker compose exec -T postgres createdb -U "$database_user" "$restore_db"
docker compose exec -T postgres pg_restore -U "$database_user" -d "$restore_db" --exit-on-error < "$backup_path"
docker compose exec -T postgres psql -U "$database_user" -d "$restore_db" -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) AS restored_features FROM spatial_feature" | tee "$output_dir/restore-verification.txt"
docker compose exec -T postgres dropdb -U "$database_user" "$restore_db"

echo "Database certification evidence written to $output_dir"
