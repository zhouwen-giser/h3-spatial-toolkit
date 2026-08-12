import {
  cellToBoundary as h3CellToBoundary,
  cellToCenterChild,
  cellToChildren,
  cellToLatLng,
  cellToParent,
  compactCells,
  getResolution,
  isPentagon,
  isValidCell,
  latLngToCell,
  uncompactCells
} from "h3-js";
import type * as GeoJSON from "geojson";

export const H3_ENGINE = "h3-js";
export const H3_ENGINE_VERSION = "4.5.0";
export const H3_TOOLKIT_VERSION = "0.3.0";
export const MIN_RESOLUTION = 0;
export const MAX_RESOLUTION = 15;

export interface GeoPoint {
  longitude: number;
  latitude: number;
}

export interface H3Cell {
  index: string;
  resolution: number;
}

export interface H3Metric {
  cell: string;
  resolution: number;
  metric: string;
  value: number;
}

export type TimeBucket = "minute" | "hour" | "day" | "week" | "month";

export interface H3TimeMetric extends H3Metric {
  timestamp: string;
  bucket: TimeBucket;
}

export interface H3Flow {
  origin: string;
  destination: string;
  count: number;
  weight?: number;
}

export const RESOLUTION_POLICY = {
  GLOBAL: 2,
  REGIONAL: 4,
  CITY: 7,
  DISTRICT: 8,
  STREET: 10,
  FINE: 12
} as const;

export type ResolutionPolicyName = keyof typeof RESOLUTION_POLICY;
export type ResolutionInput = number | ResolutionPolicyName;

export class H3ToolkitError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "H3ToolkitError";
  }
}

export function resolveResolution(input: ResolutionInput): number {
  const resolution = typeof input === "string" ? RESOLUTION_POLICY[input] : input;
  if (!Number.isInteger(resolution) || resolution < MIN_RESOLUTION || resolution > MAX_RESOLUTION) {
    throw new H3ToolkitError("INVALID_RESOLUTION", "H3 resolution must be an integer from 0 through 15", { input });
  }
  return resolution;
}

export function assertPoint(point: GeoPoint): void {
  if (!Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new H3ToolkitError("INVALID_LONGITUDE", "longitude must be within [-180, 180]", { point });
  }
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    throw new H3ToolkitError("INVALID_LATITUDE", "latitude must be within [-90, 90]", { point });
  }
}

export function assertCell(cell: string): void {
  if (!isValidCell(cell)) {
    throw new H3ToolkitError("INVALID_H3_CELL", "Invalid H3 cell index", { cell });
  }
}

export function pointToCell(point: GeoPoint, input: ResolutionInput): H3Cell {
  assertPoint(point);
  const resolution = resolveResolution(input);
  return { index: latLngToCell(point.latitude, point.longitude, resolution), resolution };
}

export function cellToPoint(cell: string): GeoPoint {
  assertCell(cell);
  const [latitude, longitude] = cellToLatLng(cell);
  return { longitude, latitude };
}

export function cellToBoundary(cell: string): GeoJSON.Polygon {
  assertCell(cell);
  const ring = h3CellToBoundary(cell, true) as [number, number][];
  const closed =
    ring.length > 0 && (ring[0]![0] !== ring.at(-1)![0] || ring[0]![1] !== ring.at(-1)![1])
      ? [...ring, ring[0]!]
      : ring;
  return { type: "Polygon", coordinates: [closed] };
}

export function getCellResolution(cell: string): number {
  assertCell(cell);
  return getResolution(cell);
}

export function getParent(cell: string, parentResolution: ResolutionInput): H3Cell {
  assertCell(cell);
  const resolution = resolveResolution(parentResolution);
  if (resolution > getResolution(cell)) {
    throw new H3ToolkitError("INVALID_PARENT_RESOLUTION", "Parent resolution cannot exceed cell resolution");
  }
  return { index: cellToParent(cell, resolution), resolution };
}

export function getChildren(cell: string, childResolution: ResolutionInput): H3Cell[] {
  assertCell(cell);
  const resolution = resolveResolution(childResolution);
  if (resolution < getResolution(cell)) {
    throw new H3ToolkitError("INVALID_CHILD_RESOLUTION", "Child resolution cannot be below cell resolution");
  }
  return cellToChildren(cell, resolution).map((index) => ({ index, resolution }));
}

export function getCenterChild(cell: string, childResolution: ResolutionInput): H3Cell {
  assertCell(cell);
  const resolution = resolveResolution(childResolution);
  if (resolution < getResolution(cell)) {
    throw new H3ToolkitError("INVALID_CHILD_RESOLUTION", "Child resolution cannot be below cell resolution");
  }
  return { index: cellToCenterChild(cell, resolution), resolution };
}

export function compact(cells: string[]): string[] {
  cells.forEach(assertCell);
  return compactCells([...new Set(cells)]);
}

export function uncompact(cells: string[], input: ResolutionInput): string[] {
  cells.forEach(assertCell);
  return uncompactCells([...new Set(cells)], resolveResolution(input));
}

export function describeCell(
  cell: string
): H3Cell & { pentagon: boolean; center: GeoPoint; boundary: GeoJSON.Polygon } {
  assertCell(cell);
  return {
    index: cell,
    resolution: getResolution(cell),
    pentagon: isPentagon(cell),
    center: cellToPoint(cell),
    boundary: cellToBoundary(cell)
  };
}
