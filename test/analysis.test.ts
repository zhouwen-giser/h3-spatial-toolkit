import { describe, expect, it } from "vitest";
import { aggregate, aggregateAverage, aggregateCount, aggregateSum, aggregateWeighted } from "@h3-toolkit/aggregation";
import { pointToCell } from "@h3-toolkit/core";
import { calculateCoverage, coverageDifference } from "@h3-toolkit/coverage";
import { aggregateFlow, calculateOD, compressTrajectory, trajectoryToCells, trajectoryToFlow } from "@h3-toolkit/flow";
import { gridDisk, gridDistance, gridPath, gridRing, isNeighbor, neighbors } from "@h3-toolkit/neighborhood";

const a = pointToCell({ longitude: 139.7671, latitude: 35.6812 }, 9).index;
const b = neighbors(a)[0]!;
const area: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [139.755, 35.672],
      [139.775, 35.672],
      [139.775, 35.69],
      [139.755, 35.69],
      [139.755, 35.672]
    ]
  ]
};

describe("neighborhood", () => {
  it("returns disk, ring, distance and path", () => {
    expect(gridDisk(a, 1)).toHaveLength(7);
    expect(gridRing(a, 1)).toHaveLength(6);
    expect(gridDistance(a, b)).toBe(1);
    expect(gridPath(a, b)).toEqual([a, b]);
    expect(isNeighbor(a, b)).toBe(true);
  });
  it("rejects unsafe radii", () => expect(() => gridDisk(a, -1)).toThrow("radius"));
});

describe("aggregation", () => {
  const records = [
    { cell: a, value: 10, weight: 1, distinct: "x" },
    { cell: a, value: 20, weight: 3, distinct: "y" },
    { cell: b, value: 5, weight: 1, distinct: "x" }
  ];
  it("computes standard aggregates", () => {
    expect(aggregateCount(records, 9).find((metric) => metric.cell === a)!.value).toBe(2);
    expect(aggregateSum(records, 9).find((metric) => metric.cell === a)!.value).toBe(30);
    expect(aggregateAverage(records, 9).find((metric) => metric.cell === a)!.value).toBe(15);
    expect(aggregateWeighted(records, 9).find((metric) => metric.cell === a)!.value).toBe(17.5);
  });
  it("computes min, max, distinct and density", () => {
    expect(aggregate(records, "min", 9)[0]!.value).toBe(10);
    expect(aggregate(records, "max", 9)[0]!.value).toBe(20);
    expect(aggregate(records, "distinctCount", 9)[0]!.value).toBe(2);
    expect(aggregate(records, "density", 9)[0]!.value).toBeGreaterThan(0);
  });
  it("indexes raw points", () =>
    expect(aggregate([{ longitude: 139.7671, latitude: 35.6812 }], "count", 9)[0]!.cell).toBe(a));
});

describe("coverage", () => {
  it("finds visited, missing and duplicate cells", () => {
    const baseline = calculateCoverage({ area, resolution: 9 });
    const visits = [baseline.requiredCells[0]!, baseline.requiredCells[0]!, baseline.requiredCells[1]!];
    const result = calculateCoverage({ area, resolution: 9, visitedCells: visits });
    expect(result.visitedRequiredCount).toBe(2);
    expect(result.duplicateVisitCount).toBe(1);
    expect(result.coverageRatio).toBeCloseTo(2 / result.requiredCount);
  });
  it("calculates differences", () => {
    const required = calculateCoverage({ area, resolution: 9 }).requiredCells;
    const diff = coverageDifference(
      { area, resolution: 9, visitedCells: required.slice(0, 2) },
      { area, resolution: 9, visitedCells: required.slice(1, 3) }
    );
    expect(diff.shared).toHaveLength(1);
    expect(diff.onlyLeft).toHaveLength(1);
  });
  it("rejects invalid and mixed-resolution visit cells", () => {
    expect(() => calculateCoverage({ area, resolution: 9, visitedCells: ["invalid"] })).toThrow("Invalid H3 cell");
    expect(() =>
      calculateCoverage({ area, resolution: 9, visitedCells: [pointToCell({ longitude: 0, latitude: 0 }, 8).index] })
    ).toThrow("resolution does not match");
  });
});

describe("flow", () => {
  const points = [
    { longitude: 139.7671, latitude: 35.6812 },
    { longitude: 139.7672, latitude: 35.6813 },
    { longitude: 139.78, latitude: 35.69 }
  ];
  it("compresses trajectories and calculates OD", () => {
    const cells = trajectoryToCells(points, 9);
    expect(compressTrajectory(cells).length).toBeLessThan(cells.length);
    expect(calculateOD(cells)!.origin).toBe(a);
  });
  it("aggregates directed and undirected flows", () => {
    const flow = trajectoryToFlow(points, 9)!;
    expect(aggregateFlow([flow, flow])[0]!.count).toBe(2);
    expect(
      aggregateFlow(
        [
          { origin: b, destination: a, count: 1 },
          { origin: a, destination: b, count: 1 }
        ],
        false
      )[0]!.count
    ).toBe(2);
  });
  it("returns null for stationary trajectories", () => expect(calculateOD([{ cell: a }, { cell: a }])).toBeNull());
  it("rejects invalid, mixed-resolution and unsafe flow values", () => {
    expect(() => aggregateFlow([{ origin: "invalid", destination: b, count: 1 }])).toThrow("Invalid H3 cell");
    expect(() =>
      aggregateFlow([{ origin: a, destination: pointToCell({ longitude: 0, latitude: 0 }, 8).index, count: 1 }])
    ).toThrow("same H3 resolution");
    expect(() => aggregateFlow([{ origin: a, destination: b, count: -1 }])).toThrow("finite non-negative");
  });
});
