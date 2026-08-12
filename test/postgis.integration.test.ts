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
