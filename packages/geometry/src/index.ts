import {
  assertPoint,
  cellToBoundary,
  H3ToolkitError,
  pointToCell,
  resolveResolution,
  type GeoPoint,
  type ResolutionInput
} from "@h3-toolkit/core";
import { cellsToMultiPolygon as h3CellsToMultiPolygon, gridPathCells, polygonToCells as h3PolygonToCells } from "h3-js";
import type * as GeoJSON from "geojson";

export type Polygonal = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export function validatePolygonal(geometry: Polygonal): void {
  if (!geometry || typeof geometry !== "object") {
    throw new H3ToolkitError("INVALID_GEOMETRY", "Geometry must be a GeoJSON Polygon or MultiPolygon");
  }
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    throw new H3ToolkitError("INVALID_GEOMETRY_TYPE", "Expected Polygon or MultiPolygon");
  }
  if (!Array.isArray(geometry.coordinates)) {
    throw new H3ToolkitError("INVALID_GEOMETRY", "Polygon coordinates must be arrays");
  }
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (polygons.length === 0) {
    throw new H3ToolkitError("EMPTY_POLYGON", "Polygon coordinates cannot be empty");
  }
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      throw new H3ToolkitError("EMPTY_POLYGON", "Polygon must contain an exterior ring");
    }
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new H3ToolkitError("INVALID_POLYGON_RING", "Polygon rings must contain at least four positions");
      }
      for (const position of ring) {
        if (!Array.isArray(position) || position.length < 2 || position.length > 3) {
          throw new H3ToolkitError("INVALID_POSITION", "GeoJSON positions must contain two or three coordinates");
        }
        assertPoint({ longitude: position[0]!, latitude: position[1]! });
        if (position[2] !== undefined && !Number.isFinite(position[2])) {
          throw new H3ToolkitError("INVALID_POSITION", "GeoJSON altitude must be a finite number");
        }
      }
      const first = ring[0]!;
      const last = ring.at(-1)!;
      if (first[0] !== last[0] || first[1] !== last[1]) {
        throw new H3ToolkitError("UNCLOSED_POLYGON_RING", "Polygon rings must be closed");
      }
    }
  }
}

export function polygonToCells(geometry: GeoJSON.Polygon, input: ResolutionInput): string[] {
  validatePolygonal(geometry);
  return h3PolygonToCells(geometry.coordinates, resolveResolution(input), true);
}

export function multiPolygonToCells(geometry: GeoJSON.MultiPolygon, input: ResolutionInput): string[] {
  validatePolygonal(geometry);
  const resolution = resolveResolution(input);
  return [...new Set(geometry.coordinates.flatMap((polygon) => h3PolygonToCells(polygon, resolution, true)))];
}

export function geometryToCells(geometry: Polygonal, input: ResolutionInput): string[] {
  return geometry.type === "Polygon" ? polygonToCells(geometry, input) : multiPolygonToCells(geometry, input);
}

export function multiPointToCells(points: GeoPoint[], input: ResolutionInput): string[] {
  return points.map((point) => pointToCell(point, input).index);
}

export function lineStringToCells(line: GeoJSON.LineString, input: ResolutionInput): string[] {
  if (line.type !== "LineString" || !Array.isArray(line.coordinates)) {
    throw new H3ToolkitError("INVALID_LINESTRING", "Expected a GeoJSON LineString");
  }
  if (line.coordinates.length === 0) return [];
  const pointCells = line.coordinates.map(
    ([longitude, latitude]) => pointToCell({ longitude: longitude!, latitude: latitude! }, input).index
  );
  const result: string[] = [];
  for (let index = 0; index < pointCells.length; index += 1) {
    const cell = pointCells[index]!;
    const previous = pointCells[index - 1];
    if (!previous) result.push(cell);
    else if (previous !== cell) {
      try {
        result.push(...gridPathCells(previous, cell).slice(1));
      } catch {
        throw new H3ToolkitError(
          "GRID_PATH_UNAVAILABLE",
          "A continuous H3 grid path could not be constructed for the line segment"
        );
      }
    }
  }
  return compressCells(result);
}

export function cellsToPolygon(cells: string[]): GeoJSON.MultiPolygon {
  if (cells.length === 0) return { type: "MultiPolygon", coordinates: [] };
  const coordinates = h3CellsToMultiPolygon([...new Set(cells)], true) as GeoJSON.Position[][][];
  return { type: "MultiPolygon", coordinates };
}

export function cellsToGeoJSON(cells: string[]): GeoJSON.FeatureCollection<GeoJSON.Polygon, { cell: string }> {
  return {
    type: "FeatureCollection",
    features: [...new Set(cells)].map((cell) => ({
      type: "Feature",
      properties: { cell },
      geometry: cellToBoundary(cell)
    }))
  };
}

export function compressCells(cells: string[]): string[] {
  return cells.filter((cell, index) => index === 0 || cell !== cells[index - 1]);
}
