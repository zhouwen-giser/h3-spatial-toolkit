import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { cellToBoundary, cellToParent, isPentagon, latLngToCell, polygonToCells } from "h3-js";
import type { MultiPolygon, Polygon } from "geojson";

interface PointCase {
  id: string;
  longitude: number;
  latitude: number;
  resolution: number;
  parentResolution?: number;
  expectedCell: string;
  expectedParent?: string;
  expectedPentagon: boolean;
  expectedBoundary: number[][];
}

interface PolygonCase {
  id: string;
  resolution: number;
  geometry: Polygon | MultiPolygon;
  expectedCellCount: number;
  expectedCells: string[];
}

interface GoldenFixture {
  schemaVersion: number;
  engineVersion: string;
  pointCases: PointCase[];
  polygonCases: PolygonCase[];
}

const fixture = JSON.parse(
  await readFile(new URL("../database/fixtures/h3-cross-engine-golden.json", import.meta.url), "utf8")
) as GoldenFixture;

describe("cross-engine Golden fixture", () => {
  it("has a stable, reviewable case inventory", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.engineVersion).toBe("4.5.0");
    expect(fixture.pointCases.map((item) => item.id)).toEqual([
      "tokyo-station-r9",
      "tokyo-global-r0",
      "dateline-east-r15",
      "north-polar-r5",
      "south-polar-r5",
      "pentagon-center-r1"
    ]);
    expect(fixture.polygonCases.map((item) => item.id)).toEqual([
      "tokyo-simple-r9",
      "tokyo-hole-r9",
      "tokyo-multipolygon-r9",
      "antimeridian-r5"
    ]);
  });

  it.each(fixture.pointCases)("reproduces point case $id with h3-js", (item) => {
    const cell = latLngToCell(item.latitude, item.longitude, item.resolution);
    expect(cell).toBe(item.expectedCell);
    expect(isPentagon(cell)).toBe(item.expectedPentagon);
    if (item.parentResolution !== undefined)
      expect(cellToParent(cell, item.parentResolution)).toBe(item.expectedParent);
    const boundary = cellToBoundary(cell).map(([latitude, longitude]) => [longitude, latitude]);
    expect([...boundary, boundary[0]]).toEqual(item.expectedBoundary);
  });

  it.each(fixture.polygonCases)("reproduces polygon case $id with h3-js", (item) => {
    const cells = geometryCells(item.geometry, item.resolution);
    expect(cells).toHaveLength(item.expectedCellCount);
    expect(cells).toEqual(item.expectedCells);
  });
});

function geometryCells(geometry: Polygon | MultiPolygon, resolution: number): string[] {
  const cells =
    geometry.type === "Polygon"
      ? polygonToCells(geometry.coordinates, resolution, true)
      : geometry.coordinates.flatMap((polygon) => polygonToCells(polygon, resolution, true));
  return [...new Set(cells)].sort();
}
