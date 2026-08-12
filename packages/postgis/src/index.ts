import type { GeoPoint, ResolutionInput } from "@h3-toolkit/core";
import { resolveResolution } from "@h3-toolkit/core";
import { Pool, type PoolConfig } from "pg";
import type * as GeoJSON from "geojson";

export class PostgisH3Adapter {
  readonly pool: Pool;

  constructor(config: PoolConfig | string) {
    this.pool = new Pool(typeof config === "string" ? { connectionString: config } : config);
  }

  async pointToCell(point: GeoPoint, input: ResolutionInput): Promise<string> {
    const resolution = resolveResolution(input);
    const result = await this.pool.query<{ cell: string }>(
      "SELECT h3_latlng_to_cell(ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)::text AS cell",
      [point.longitude, point.latitude, resolution]
    );
    return result.rows[0]!.cell;
  }

  async geometryToCells(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon, input: ResolutionInput): Promise<string[]> {
    const result = await this.pool.query<{ cell: string }>(
      "SELECT cell::text FROM h3_polygon_to_cells(ST_GeomFromGeoJSON($1), $2) AS cell",
      [JSON.stringify(geometry), resolveResolution(input)]
    );
    return result.rows.map((row) => row.cell);
  }

  async cellToGeometry(cell: string): Promise<GeoJSON.Polygon> {
    const result = await this.pool.query<{ geometry: GeoJSON.Polygon }>(
      "SELECT ST_AsGeoJSON(h3_cell_to_boundary_geometry($1::h3index))::json AS geometry",
      [cell]
    );
    return result.rows[0]!.geometry;
  }

  async cellToParent(cell: string, input: ResolutionInput): Promise<string> {
    const result = await this.pool.query<{ parent: string }>(
      "SELECT h3_cell_to_parent($1::h3index, $2)::text AS parent",
      [cell, resolveResolution(input)]
    );
    return result.rows[0]!.parent;
  }

  async health(): Promise<{ postgis: string; h3: string; h3Postgis: string }> {
    const result = await this.pool.query<{ postgis: string; h3: string; h3Postgis: string }>(
      `SELECT
         postgis_version() AS postgis,
         max(extversion) FILTER (WHERE extname = 'h3') AS h3,
         max(extversion) FILTER (WHERE extname = 'h3_postgis') AS "h3Postgis"
       FROM pg_extension
       WHERE extname IN ('h3', 'h3_postgis')`
    );
    return result.rows[0]!;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const TWO_STAGE_FILTER_SQL = `
WITH coarse AS (
  SELECT DISTINCT h3_polygon_to_cells($1::geometry, $2) AS cell
)
SELECT f.*
FROM spatial_feature f
JOIN coarse c ON f.h3_cell = c.cell
WHERE ST_Intersects(f.geom, $1::geometry);
`.trim();
