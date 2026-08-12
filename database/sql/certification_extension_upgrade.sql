\set ON_ERROR_STOP on

\if :{?certification_upgrade_db}
\else
  \echo 'certification_upgrade_db is required'
  \quit 2
\endif

-- This is a destructive test only for the fixed, certification-only database
-- below. It never changes the primary application database. A failed prior run
-- may leave the database behind; replacing it makes the script idempotent. The
-- source version is freshly installed; this script never attempts a downgrade.
\connect postgres

DO $certification$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_available_extension_versions
    WHERE name = 'h3' AND version = '4.2.3'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_available_extension_versions
    WHERE name = 'h3_postgis' AND version = '4.2.3'
  ) THEN
    RAISE EXCEPTION 'Required source extensions h3/h3_postgis 4.2.3 are unavailable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_available_extension_versions
    WHERE name = 'h3' AND version = '4.5.0'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_available_extension_versions
    WHERE name = 'h3_postgis' AND version = '4.5.0'
  ) THEN
    RAISE EXCEPTION 'Required target extensions h3/h3_postgis 4.5.0 are unavailable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension_update_paths('h3')
    WHERE source = '4.2.3' AND target = '4.5.0' AND path IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_extension_update_paths('h3_postgis')
    WHERE source = '4.2.3' AND target = '4.5.0' AND path IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Required 4.2.3 to 4.5.0 extension update path is unavailable';
  END IF;
END
$certification$;

SELECT count(*) = 0 AS upgrade_db_absent
FROM pg_database
WHERE datname = :'certification_upgrade_db' \gset
\if :upgrade_db_absent
\else
  \echo 'Refusing to overwrite pre-existing certification upgrade database'
  \quit 2
\endif
SELECT format('CREATE DATABASE %I TEMPLATE template0', :'certification_upgrade_db') \gexec

\connect :certification_upgrade_db

CREATE EXTENSION postgis;
CREATE EXTENSION h3 VERSION '4.2.3';
CREATE EXTENSION h3_postgis VERSION '4.2.3' CASCADE;

DO $certification$
DECLARE
  actual_h3 text;
  actual_h3_postgis text;
BEGIN
  SELECT extversion INTO actual_h3 FROM pg_extension WHERE extname = 'h3';
  SELECT extversion INTO actual_h3_postgis FROM pg_extension WHERE extname = 'h3_postgis';

  IF actual_h3 <> '4.2.3' OR actual_h3_postgis <> '4.2.3' THEN
    RAISE EXCEPTION
      'Source extension version assertion failed: h3=%, h3_postgis=%',
      actual_h3,
      actual_h3_postgis;
  END IF;
END
$certification$;

CREATE TABLE extension_upgrade_fixture (
  id integer PRIMARY KEY,
  label text NOT NULL UNIQUE,
  geom geometry(Point, 4326) NOT NULL,
  cell h3index NOT NULL,
  resolution smallint NOT NULL
);

INSERT INTO extension_upgrade_fixture (id, label, geom, cell, resolution)
SELECT
  id,
  label,
  geom,
  h3_latlng_to_cell(geom, 9),
  9
FROM (
  VALUES
    (1, 'tokyo', ST_SetSRID(ST_MakePoint(139.7671, 35.6812), 4326)),
    (2, 'london', ST_SetSRID(ST_MakePoint(-0.1276, 51.5072), 4326)),
    (3, 'sydney', ST_SetSRID(ST_MakePoint(151.2093, -33.8688), 4326))
) AS fixture(id, label, geom);

CREATE INDEX extension_upgrade_fixture_cell_bix
  ON extension_upgrade_fixture USING btree (cell);
CREATE INDEX extension_upgrade_fixture_geom_gix
  ON extension_upgrade_fixture USING gist (geom);

CREATE TABLE extension_upgrade_expectation AS
SELECT
  count(*) AS row_count,
  md5(
    string_agg(
      concat_ws('|', id, label, ST_AsEWKT(geom), cell::text, resolution),
      E'\n'
      ORDER BY id
    )
  ) AS content_checksum
FROM extension_upgrade_fixture;

CREATE TABLE extension_upgrade_index_expectation AS
SELECT
  count(*) AS index_count,
  md5(
    string_agg(
      index_relation.relname || '|' || pg_get_indexdef(index_catalog.indexrelid),
      E'\n'
      ORDER BY index_relation.relname
    )
  ) AS index_checksum
FROM pg_index AS index_catalog
JOIN pg_class AS index_relation ON index_relation.oid = index_catalog.indexrelid
WHERE index_catalog.indrelid = 'extension_upgrade_fixture'::regclass;

ALTER EXTENSION h3 UPDATE TO '4.5.0';
ALTER EXTENSION h3_postgis UPDATE TO '4.5.0';

DO $certification$
DECLARE
  actual_h3 text;
  actual_h3_postgis text;
  expected_rows bigint;
  actual_rows bigint;
  expected_checksum text;
  actual_checksum text;
  expected_indexes integer;
  actual_indexes integer;
  expected_index_checksum text;
  actual_index_checksum text;
  preserved_indexes integer;
  tokyo_matches integer;
BEGIN
  SELECT extversion INTO actual_h3 FROM pg_extension WHERE extname = 'h3';
  SELECT extversion INTO actual_h3_postgis FROM pg_extension WHERE extname = 'h3_postgis';

  IF actual_h3 <> '4.5.0' OR actual_h3_postgis <> '4.5.0' THEN
    RAISE EXCEPTION
      'Target extension version assertion failed: h3=%, h3_postgis=%',
      actual_h3,
      actual_h3_postgis;
  END IF;

  SELECT row_count, content_checksum
  INTO expected_rows, expected_checksum
  FROM extension_upgrade_expectation;

  SELECT
    count(*),
    md5(
      string_agg(
        concat_ws('|', id, label, ST_AsEWKT(geom), cell::text, resolution),
        E'\n'
        ORDER BY id
      )
    )
  INTO actual_rows, actual_checksum
  FROM extension_upgrade_fixture;

  IF actual_rows <> expected_rows OR actual_checksum IS DISTINCT FROM expected_checksum THEN
    RAISE EXCEPTION
      'Fixture data changed during extension upgrade: rows %/%, checksum %/%',
      actual_rows,
      expected_rows,
      actual_checksum,
      expected_checksum;
  END IF;

  SELECT index_count, index_checksum
  INTO expected_indexes, expected_index_checksum
  FROM extension_upgrade_index_expectation;

  SELECT
    count(*),
    md5(
      string_agg(
        index_relation.relname || '|' || pg_get_indexdef(index_catalog.indexrelid),
        E'\n'
        ORDER BY index_relation.relname
      )
    )
  INTO actual_indexes, actual_index_checksum
  FROM pg_index AS index_catalog
  JOIN pg_class AS index_relation ON index_relation.oid = index_catalog.indexrelid
  WHERE index_catalog.indrelid = 'extension_upgrade_fixture'::regclass
    AND index_catalog.indisvalid
    AND index_catalog.indisready;

  IF actual_indexes <> expected_indexes
    OR actual_index_checksum IS DISTINCT FROM expected_index_checksum THEN
    RAISE EXCEPTION
      'Fixture indexes changed during extension upgrade: count %/%, checksum %/%',
      actual_indexes,
      expected_indexes,
      actual_index_checksum,
      expected_index_checksum;
  END IF;

  SELECT count(*)
  INTO preserved_indexes
  FROM pg_index AS index_catalog
  JOIN pg_class AS index_relation ON index_relation.oid = index_catalog.indexrelid
  WHERE index_catalog.indrelid = 'extension_upgrade_fixture'::regclass
    AND index_catalog.indisvalid
    AND index_catalog.indisready
    AND (
      (index_relation.relname = 'extension_upgrade_fixture_cell_bix'
        AND pg_get_indexdef(index_catalog.indexrelid) LIKE '%USING btree (cell)%')
      OR
      (index_relation.relname = 'extension_upgrade_fixture_geom_gix'
        AND pg_get_indexdef(index_catalog.indexrelid) LIKE '%USING gist (geom)%')
    );

  IF preserved_indexes <> 2 THEN
    RAISE EXCEPTION 'Expected two valid fixture indexes after upgrade, got %', preserved_indexes;
  END IF;

  SELECT count(*)
  INTO tokyo_matches
  FROM extension_upgrade_fixture
  WHERE cell = h3_latlng_to_cell(
    ST_SetSRID(ST_MakePoint(139.7671, 35.6812), 4326),
    9
  );

  IF tokyo_matches <> 1 THEN
    RAISE EXCEPTION 'Post-upgrade H3 lookup returned % Tokyo rows instead of one', tokyo_matches;
  END IF;
END
$certification$;

\connect postgres

SELECT format('DROP DATABASE %I WITH (FORCE)', :'certification_upgrade_db') \gexec

SELECT count(*) = 0 AS upgrade_database_removed
FROM pg_database
WHERE datname = :'certification_upgrade_db' \gset
\if :upgrade_database_removed
\else
  \echo 'Certification upgrade database cleanup failed'
  \quit 3
\endif

SELECT
  'PASS' AS extension_upgrade_certification,
  '4.2.3' AS source_version,
  '4.5.0' AS target_version,
  3 AS preserved_rows,
  4 AS preserved_indexes,
  true AS temporary_database_removed;
