import {
  assertCell,
  getCellResolution,
  H3ToolkitError,
  pointToCell,
  resolveResolution,
  type GeoPoint,
  type H3Metric,
  type ResolutionInput
} from "@h3-toolkit/core";
import { cellArea } from "h3-js";

export interface AggregateRecord extends Partial<GeoPoint> {
  cell?: string;
  value?: number;
  weight?: number;
  distinct?: string | number;
}

export type AggregateOperation =
  "count" | "sum" | "average" | "min" | "max" | "weightedAverage" | "density" | "distinctCount";

interface State {
  count: number;
  sum: number;
  min: number;
  max: number;
  weightedSum: number;
  weightSum: number;
  distinct: Set<string | number>;
}

export function aggregate(
  records: AggregateRecord[],
  operation: AggregateOperation,
  input: ResolutionInput,
  metric: string = operation
): H3Metric[] {
  const resolution = resolveResolution(input);
  const groups = new Map<string, State>();
  for (const record of records) {
    const cell = record.cell ?? pointToCell(requirePoint(record), resolution).index;
    assertCell(cell);
    if (getCellResolution(cell) !== resolution) {
      throw new H3ToolkitError("CELL_RESOLUTION_MISMATCH", "Aggregate cell resolution does not match the request", {
        expectedResolution: resolution,
        actualResolution: getCellResolution(cell)
      });
    }
    const value = record.value ?? 1;
    const weight = record.weight ?? 1;
    if (!Number.isFinite(value) || !Number.isFinite(weight)) {
      throw new H3ToolkitError("INVALID_AGGREGATE_VALUE", "value and weight must be finite numbers");
    }
    const state = groups.get(cell) ?? {
      count: 0,
      sum: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      weightedSum: 0,
      weightSum: 0,
      distinct: new Set<string | number>()
    };
    state.count += 1;
    state.sum += value;
    state.min = Math.min(state.min, value);
    state.max = Math.max(state.max, value);
    state.weightedSum += value * weight;
    state.weightSum += weight;
    if (record.distinct !== undefined) state.distinct.add(record.distinct);
    groups.set(cell, state);
  }
  return [...groups.entries()].map(([cell, state]) => ({
    cell,
    resolution,
    metric,
    value: valueFor(operation, cell, state)
  }));
}

export const aggregateCount = (records: AggregateRecord[], resolution: ResolutionInput) =>
  aggregate(records, "count", resolution);
export const aggregateSum = (records: AggregateRecord[], resolution: ResolutionInput) =>
  aggregate(records, "sum", resolution);
export const aggregateAverage = (records: AggregateRecord[], resolution: ResolutionInput) =>
  aggregate(records, "average", resolution);
export const aggregateWeighted = (records: AggregateRecord[], resolution: ResolutionInput) =>
  aggregate(records, "weightedAverage", resolution);

function requirePoint(record: AggregateRecord): GeoPoint {
  if (record.longitude === undefined || record.latitude === undefined) {
    throw new H3ToolkitError(
      "INVALID_AGGREGATE_RECORD",
      "Each aggregate record needs either cell or longitude/latitude"
    );
  }
  return { longitude: record.longitude, latitude: record.latitude };
}

function valueFor(operation: AggregateOperation, cell: string, state: State): number {
  switch (operation) {
    case "count":
      return state.count;
    case "sum":
      return state.sum;
    case "average":
      return state.sum / state.count;
    case "min":
      return state.min;
    case "max":
      return state.max;
    case "weightedAverage":
      return state.weightSum === 0 ? 0 : state.weightedSum / state.weightSum;
    case "density":
      return state.count / cellArea(cell, "km2");
    case "distinctCount":
      return state.distinct.size;
  }
}
