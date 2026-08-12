import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PostgisH3Adapter } from "@h3-toolkit/postgis";
import type { MultiPolygon, Polygon } from "geojson";

const databaseUrl = process.env.TEST_DATABASE_URL;
const fixture = JSON.parse(
  await readFile(new URL("../database/fixtures/h3-cross-engine-golden.json", import.meta.url), "utf8")
) as GoldenFixture;

describe.skipIf(!databaseUrl)("PostGIS/H3 integration", () => {
  it("reports the certified extension versions", async () => {
    const adapter = new PostgisH3Adapter(databaseUrl!);
    try {
      const health = await adapter.health();
      expect(health.h3).toMatch(/^4\.5/);
      expect(health.h3Postgis).toMatch(/^4\.5/);
      expect(health.postgis).toMatch(/^3\.5/);
    } finally {
      await adapter.close();
    }
  });

  it.each(fixture.pointCases)("matches point, hierarchy and boundary Golden case $id", async (item) => {
    const adapter = new PostgisH3Adapter(databaseUrl!);
    try {
      const cell = await adapter.pointToCell(item, item.resolution);
      expect(cell).toBe(item.expectedCell);
      if (item.parentResolution !== undefined) {
        expect(await adapter.cellToParent(cell, item.parentResolution)).toBe(item.expectedParent);
      }
      const geometry = await adapter.cellToGeometry(cell);
      expect(geometry.type).toBe("Polygon");
      if (geometry.type !== "Polygon") {
        throw new Error(`Expected Polygon for Golden point case ${item.id}, received ${geometry.type}`);
      }
      expect(canonicalRing(geometry.coordinates[0] ?? [], fixture.boundaryToleranceDegrees)).toEqual(
        canonicalRing(item.expectedBoundary, fixture.boundaryToleranceDegrees)
      );
    } finally {
      await adapter.close();
    }
  });

  it.each(fixture.polygonCases)("matches polygon Golden set $id", async (item) => {
    const adapter = new PostgisH3Adapter(databaseUrl!);
    try {
      const cells = (await adapter.geometryToCells(item.geometry, item.resolution)).sort();
      expect(cells).toHaveLength(item.expectedCellCount);
      expect(cells).toEqual(item.expectedCells);
    } finally {
      await adapter.close();
    }
  });

  it("returns a split MultiPolygon boundary for an antimeridian cell", async () => {
    const antimeridianCell = "857eb503fffffff";
    const goldenCase = fixture.polygonCases.find((item) => item.id === "antimeridian-r5");
    expect(goldenCase?.expectedCells).toContain(antimeridianCell);

    const adapter = new PostgisH3Adapter(databaseUrl!);
    try {
      const geometry = await adapter.cellToGeometry(antimeridianCell);
      expect(geometry.type).toBe("MultiPolygon");
      if (geometry.type !== "MultiPolygon") {
        throw new Error(`Expected MultiPolygon, received ${geometry.type}`);
      }

      expect(geometry.coordinates).toHaveLength(2);
      const rings = geometry.coordinates.flat();
      expect(rings).toHaveLength(2);
      for (const ring of rings) {
        expect(ring[0]).toEqual(ring.at(-1));
        for (const [longitude, latitude] of ring) {
          expect(longitude).toBeGreaterThanOrEqual(-180);
          expect(longitude).toBeLessThanOrEqual(180);
          expect(latitude).toBeGreaterThanOrEqual(-90);
          expect(latitude).toBeLessThanOrEqual(90);
        }
      }
      expect(rings.some((ring) => ring.some(([longitude]) => longitude === -180))).toBe(true);
      expect(rings.some((ring) => ring.some(([longitude]) => longitude === 180))).toBe(true);
    } finally {
      await adapter.close();
    }
  });

  it("rejects invalid cell inputs with the shared toolkit error", async () => {
    const adapter = new PostgisH3Adapter(databaseUrl!);
    try {
      await expect(adapter.cellToGeometry("not-a-cell")).rejects.toMatchObject({ code: "INVALID_H3_CELL" });
      await expect(adapter.cellToParent("not-a-cell", 0)).rejects.toMatchObject({ code: "INVALID_H3_CELL" });
    } finally {
      await adapter.close();
    }
  });
});

interface GoldenFixture {
  boundaryToleranceDegrees: number;
  pointCases: Array<{
    id: string;
    longitude: number;
    latitude: number;
    resolution: number;
    parentResolution?: number;
    expectedCell: string;
    expectedParent?: string;
    expectedBoundary: number[][];
  }>;
  polygonCases: Array<{
    id: string;
    resolution: number;
    geometry: Polygon | MultiPolygon;
    expectedCellCount: number;
    expectedCells: string[];
  }>;
}

function canonicalRing(ring: number[][], tolerance: number): string[] {
  const coordinates = ring
    .slice(0, -1)
    .map(([longitude = 0, latitude = 0]) => [Math.round(longitude / tolerance), Math.round(latitude / tolerance)]);
  return coordinates.map(([longitude, latitude]) => `${longitude}:${latitude}`).sort();
}
