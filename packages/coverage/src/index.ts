import {
  assertCell,
  getCellResolution,
  H3ToolkitError,
  pointToCell,
  resolveResolution,
  type GeoPoint,
  type ResolutionInput
} from "@h3-toolkit/core";
import { geometryToCells, type Polygonal } from "@h3-toolkit/geometry";

export interface CoverageResult {
  resolution: number;
  requiredCells: string[];
  visitedCells: string[];
  missingCells: string[];
  duplicateCells: string[];
  requiredCount: number;
  visitedRequiredCount: number;
  missingCount: number;
  duplicateVisitCount: number;
  coverageRatio: number;
  coverageEfficiency: number;
}

export interface CoverageInput {
  area: Polygonal;
  resolution: ResolutionInput;
  visitedCells?: string[];
  visitedPoints?: GeoPoint[];
}

export function calculateCoverage(input: CoverageInput): CoverageResult {
  const resolution = resolveResolution(input.resolution);
  const requiredCells = geometryToCells(input.area, resolution);
  for (const cell of input.visitedCells ?? []) {
    assertCell(cell);
    const actualResolution = getCellResolution(cell);
    if (actualResolution !== resolution) {
      throw new H3ToolkitError("CELL_RESOLUTION_MISMATCH", "Visited cell resolution does not match coverage resolution", {
        expectedResolution: resolution,
        actualResolution
      });
    }
  }
  const visits = [
    ...(input.visitedCells ?? []),
    ...(input.visitedPoints ?? []).map((point) => pointToCell(point, resolution).index)
  ];
  const required = new Set(requiredCells);
  const counts = new Map<string, number>();
  for (const cell of visits) counts.set(cell, (counts.get(cell) ?? 0) + 1);
  const visitedCells = [...counts.keys()].filter((cell) => required.has(cell));
  const missingCells = requiredCells.filter((cell) => !counts.has(cell));
  const duplicateCells = [...counts.entries()].filter(([cell, count]) => required.has(cell) && count > 1).map(([cell]) => cell);
  const duplicateVisitCount = [...counts.entries()].reduce((sum, [cell, count]) => sum + (required.has(cell) ? Math.max(0, count - 1) : 0), 0);
  return {
    resolution,
    requiredCells,
    visitedCells,
    missingCells,
    duplicateCells,
    requiredCount: requiredCells.length,
    visitedRequiredCount: visitedCells.length,
    missingCount: missingCells.length,
    duplicateVisitCount,
    coverageRatio: requiredCells.length === 0 ? 1 : visitedCells.length / requiredCells.length,
    coverageEfficiency: visits.length === 0 ? 0 : visitedCells.length / visits.length
  };
}

export const findMissingCells = (input: CoverageInput) => calculateCoverage(input).missingCells;
export const findVisitedCells = (input: CoverageInput) => calculateCoverage(input).visitedCells;
export const calculateCoverageRatio = (input: CoverageInput) => calculateCoverage(input).coverageRatio;

export function coverageDifference(left: CoverageInput, right: CoverageInput): { onlyLeft: string[]; onlyRight: string[]; shared: string[] } {
  const a = new Set(calculateCoverage(left).visitedCells);
  const b = new Set(calculateCoverage(right).visitedCells);
  return {
    onlyLeft: [...a].filter((cell) => !b.has(cell)),
    onlyRight: [...b].filter((cell) => !a.has(cell)),
    shared: [...a].filter((cell) => b.has(cell))
  };
}
