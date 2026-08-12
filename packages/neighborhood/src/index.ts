import { assertCell, H3ToolkitError } from "@h3-toolkit/core";
import {
  areNeighborCells,
  gridDisk as h3GridDisk,
  gridDistance as h3GridDistance,
  gridPathCells,
  gridRing as h3GridRing
} from "h3-js";

export function neighbors(cell: string): string[] {
  assertCell(cell);
  return h3GridDisk(cell, 1).filter((candidate) => candidate !== cell);
}

export function gridDisk(cell: string, radius: number): string[] {
  assertCell(cell);
  assertRadius(radius);
  return h3GridDisk(cell, radius);
}

export function gridRing(cell: string, radius: number): string[] {
  assertCell(cell);
  assertRadius(radius);
  return h3GridRing(cell, radius);
}

export function gridDistance(origin: string, destination: string): number {
  assertCell(origin);
  assertCell(destination);
  return h3GridDistance(origin, destination);
}

export function gridPath(origin: string, destination: string): string[] {
  assertCell(origin);
  assertCell(destination);
  return gridPathCells(origin, destination);
}

export function isNeighbor(origin: string, destination: string): boolean {
  assertCell(origin);
  assertCell(destination);
  return areNeighborCells(origin, destination);
}

function assertRadius(radius: number): void {
  if (!Number.isInteger(radius) || radius < 0 || radius > 1000) {
    throw new H3ToolkitError("INVALID_NEIGHBOR_RADIUS", "radius must be an integer from 0 through 1000");
  }
}
