import { describe, expect, it } from "vitest";
import { getPentagons, isValidCell } from "h3-js";
import {
  H3ToolkitError,
  RESOLUTION_POLICY,
  cellToBoundary,
  cellToPoint,
  compact,
  describeCell,
  getChildren,
  getParent,
  pointToCell,
  resolveResolution,
  uncompact
} from "@h3-toolkit/core";

describe("core and coordinate policy", () => {
  it("indexes a Tokyo point without swapping longitude and latitude", () => {
    const cell = pointToCell({ longitude: 139.7671, latitude: 35.6812 }, 9);
    expect(cell.index).toBe("892f5a32d97ffff");
    expect(cell.resolution).toBe(9);
  });

  it("round-trips a cell center", () => {
    const cell = pointToCell({ longitude: 139.7671, latitude: 35.6812 }, 12).index;
    const center = cellToPoint(cell);
    expect(center.longitude).toBeCloseTo(139.7671, 2);
    expect(center.latitude).toBeCloseTo(35.6812, 2);
  });

  it("emits a closed GeoJSON ring in longitude/latitude order", () => {
    const geometry = cellToBoundary(pointToCell({ longitude: 139.7, latitude: 35.6 }, 9).index);
    expect(geometry.coordinates[0]![0]).toEqual(geometry.coordinates[0]!.at(-1));
    expect(Math.abs(geometry.coordinates[0]![0]![0]!)).toBeGreaterThan(90);
  });

  it("supports resolution 0 and 15", () => {
    expect(pointToCell({ longitude: 0, latitude: 0 }, 0).resolution).toBe(0);
    expect(pointToCell({ longitude: 0, latitude: 0 }, 15).resolution).toBe(15);
  });

  it("resolves named policies", () => {
    expect(resolveResolution("CITY")).toBe(RESOLUTION_POLICY.CITY);
    expect(resolveResolution("FINE")).toBe(12);
  });

  it("rejects invalid coordinates and resolutions", () => {
    expect(() => pointToCell({ longitude: 181, latitude: 0 }, 9)).toThrow(H3ToolkitError);
    expect(() => pointToCell({ longitude: 0, latitude: 91 }, 9)).toThrow("latitude");
    expect(() => resolveResolution(16)).toThrow("0 through 15");
  });

  it("wraps parent and children", () => {
    const child = pointToCell({ longitude: 139.7, latitude: 35.6 }, 9).index;
    const parent = getParent(child, 8);
    const children = getChildren(parent.index, 9);
    expect(children.some((candidate) => candidate.index === child)).toBe(true);
  });

  it("compacts and uncompacts without data loss", () => {
    const parent = pointToCell({ longitude: 0, latitude: 0 }, 5).index;
    const children = getChildren(parent, 6).map((cell) => cell.index);
    expect(compact(children)).toEqual([parent]);
    expect(new Set(uncompact([parent], 6))).toEqual(new Set(children));
  });

  it("describes pentagons", () => {
    const pentagon = getPentagons(5)[0]!;
    expect(describeCell(pentagon).pentagon).toBe(true);
  });

  it("rejects invalid indexes", () => {
    expect(isValidCell("not-a-cell")).toBe(false);
    expect(() => cellToPoint("not-a-cell")).toThrow("Invalid H3");
  });
});
