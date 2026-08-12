import { describe, expect, it } from "vitest";
import { pointToCell } from "@h3-toolkit/core";
import { cellToLatLng } from "h3-js";
import {
  cellsToGeoJSON,
  cellsToPolygon,
  geometryToCells,
  lineStringToCells,
  multiPointToCells,
  multiPolygonToCells,
  polygonToCells,
  validatePolygonal
} from "@h3-toolkit/geometry";

const tokyo: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [139.735, 35.665],
      [139.785, 35.665],
      [139.785, 35.695],
      [139.735, 35.695],
      [139.735, 35.665]
    ]
  ]
};

describe("geometry", () => {
  it("covers Polygon and exports cell polygons", () => {
    const cells = polygonToCells(tokyo, 9);
    expect(cells.length).toBeGreaterThan(20);
    expect(cellsToGeoJSON(cells).features).toHaveLength(cells.length);
  });

  it("covers MultiPolygon without duplicates", () => {
    const multi: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        tokyo.coordinates,
        [
          [
            [139.8, 35.7],
            [139.81, 35.7],
            [139.81, 35.71],
            [139.8, 35.71],
            [139.8, 35.7]
          ]
        ]
      ]
    };
    const cells = multiPolygonToCells(multi, 9);
    expect(cells.length).toBe(new Set(cells).size);
    expect(geometryToCells(multi, 9)).toEqual(cells);
  });

  it("respects polygon holes", () => {
    const withHole: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        tokyo.coordinates[0]!,
        [
          [139.75, 35.675],
          [139.77, 35.675],
          [139.77, 35.685],
          [139.75, 35.685],
          [139.75, 35.675]
        ]
      ]
    };
    expect(polygonToCells(withHole, 9).length).toBeLessThan(polygonToCells(tokyo, 9).length);
  });

  it("handles an antimeridian polygon", () => {
    const geometry: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [179.7, 10],
          [-179.7, 10],
          [-179.7, 10.3],
          [179.7, 10.3],
          [179.7, 10]
        ]
      ]
    };
    expect(polygonToCells(geometry, 4).length).toBeGreaterThan(0);
  });

  it("handles north and south polar caps", () => {
    const north: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-135, 85],
          [0, 89],
          [135, 85],
          [-135, 85]
        ]
      ]
    };
    const south: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-135, -85],
          [0, -89],
          [135, -85],
          [-135, -85]
        ]
      ]
    };
    expect(polygonToCells(north, 3).length).toBeGreaterThan(0);
    expect(polygonToCells(south, 3).length).toBeGreaterThan(0);
  });

  it("returns no cell for a very small polygon at coarse resolution", () => {
    const tiny: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [139.7, 35.6],
          [139.700001, 35.6],
          [139.700001, 35.600001],
          [139.7, 35.600001],
          [139.7, 35.6]
        ]
      ]
    };
    expect(polygonToCells(tiny, 5)).toEqual([]);
  });

  it("rejects unclosed and invalid polygons", () => {
    expect(() =>
      validatePolygonal({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1]
          ]
        ]
      })
    ).toThrow("closed");
    expect(() => validatePolygonal({ type: "Polygon", coordinates: [] })).toThrow();
  });

  it("rejects malformed geometry structures with stable errors", () => {
    expect(() => validatePolygonal(null as never)).toThrow("GeoJSON Polygon");
    expect(() => validatePolygonal({ type: "Point" } as never)).toThrow("Expected Polygon");
    expect(() => validatePolygonal({ type: "Polygon", coordinates: "invalid" } as never)).toThrow(
      "coordinates must be arrays"
    );
    expect(() => validatePolygonal({ type: "MultiPolygon", coordinates: [[]] })).toThrow("exterior ring");
    expect(() =>
      validatePolygonal({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [0, 0]
          ]
        ]
      })
    ).toThrow("at least four positions");
    expect(() =>
      validatePolygonal({
        type: "Polygon",
        coordinates: [
          [
            [0, 0, Number.NaN],
            [1, 0],
            [1, 1],
            [0, 0, Number.NaN]
          ]
        ]
      })
    ).toThrow("altitude");
    expect(() => lineStringToCells({ type: "Point" } as never, 9)).toThrow("LineString");
    expect(lineStringToCells({ type: "LineString", coordinates: [] }, 9)).toEqual([]);
  });

  it("maps multipoints", () => {
    const cells = multiPointToCells(
      [
        { longitude: 0, latitude: 0 },
        { longitude: 1, latitude: 1 }
      ],
      7
    );
    expect(cells).toHaveLength(2);
    expect(cells[0]).toBe(pointToCell({ longitude: 0, latitude: 0 }, 7).index);
  });

  it("turns a line into a continuous compressed cell sequence", () => {
    const cells = lineStringToCells(
      {
        type: "LineString",
        coordinates: [
          [139.75, 35.67],
          [139.77, 35.68],
          [139.78, 35.69]
        ]
      },
      9
    );
    expect(cells.length).toBeGreaterThan(2);
    expect(cells.every((cell, index) => index === 0 || cell !== cells[index - 1])).toBe(true);
  });

  it("fails explicitly when H3 cannot construct a continuous grid path", () => {
    const positions = ["8001fffffffffff", "800dfffffffffff"].map((cell) => {
      const [latitude, longitude] = cellToLatLng(cell);
      return [longitude, latitude];
    });
    expect(() => lineStringToCells({ type: "LineString", coordinates: positions }, 0)).toThrow(
      "continuous H3 grid path"
    );
  });

  it("merges adjacent cells into a MultiPolygon", () => {
    const cells = polygonToCells(tokyo, 8);
    const geometry = cellsToPolygon(cells);
    expect(geometry.type).toBe("MultiPolygon");
    expect(geometry.coordinates.length).toBeGreaterThan(0);
  });
});
