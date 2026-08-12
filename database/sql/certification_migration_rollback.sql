\set ON_ERROR_STOP on

-- Refuse to overwrite an unrelated pre-existing object. A prior interrupted
-- run cannot leave this schema behind because its creation is transactional.
DO $certification$
BEGIN
  IF to_regnamespace('h3_certification_failed_migration') IS NOT NULL THEN
    RAISE EXCEPTION 'Rollback certification schema already exists';
  END IF;
END
$certification$;

-- The unique constraint is intentionally built over duplicate data. PostgreSQL
-- must abort the transaction after the earlier DDL has executed. ON_ERROR_STOP
-- is disabled for exactly this expected error so the script can inspect the
-- rollback; all unexpected setup or verification errors still stop execution.
\set ON_ERROR_STOP off
BEGIN;

CREATE SCHEMA h3_certification_failed_migration;

CREATE TABLE h3_certification_failed_migration.probe (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  marker text NOT NULL
);

ALTER TABLE h3_certification_failed_migration.probe
  ADD COLUMN migration_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX probe_marker_bix
  ON h3_certification_failed_migration.probe USING btree (marker);

INSERT INTO h3_certification_failed_migration.probe (marker)
VALUES ('duplicate'), ('duplicate');

ALTER TABLE h3_certification_failed_migration.probe
  ADD CONSTRAINT probe_marker_unique UNIQUE (marker);

\set certification_failure_seen :ERROR
\set certification_failure_sqlstate :SQLSTATE
ROLLBACK;
\set ON_ERROR_STOP on

CREATE TEMP TABLE certification_migration_rollback_observation (
  failure_seen boolean NOT NULL,
  failure_sqlstate text NOT NULL
);

INSERT INTO certification_migration_rollback_observation (
  failure_seen,
  failure_sqlstate
)
VALUES (
  :'certification_failure_seen'::boolean,
  :'certification_failure_sqlstate'
);

DO $certification$
DECLARE
  observed_failure boolean;
  observed_sqlstate text;
BEGIN
  SELECT failure_seen, failure_sqlstate
  INTO observed_failure, observed_sqlstate
  FROM certification_migration_rollback_observation;

  IF observed_failure IS NOT TRUE OR observed_sqlstate <> '23505' THEN
    RAISE EXCEPTION
      'Expected unique_violation 23505 was not observed: failure=%, SQLSTATE=%',
      observed_failure,
      observed_sqlstate;
  END IF;

  IF to_regnamespace('h3_certification_failed_migration') IS NOT NULL
    OR to_regclass('h3_certification_failed_migration.probe') IS NOT NULL
    OR to_regclass('h3_certification_failed_migration.probe_marker_bix') IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'probe_marker_unique'
    ) THEN
    RAISE EXCEPTION 'Failed schema migration left catalog objects behind';
  END IF;
END
$certification$;

SELECT
  'PASS' AS migration_rollback_certification,
  failure_sqlstate,
  true AS schema_absent,
  true AS table_absent,
  true AS index_absent,
  true AS constraint_absent
FROM certification_migration_rollback_observation;
