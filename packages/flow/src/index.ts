import {
  assertCell,
  getCellResolution,
  H3ToolkitError,
  pointToCell,
  resolveResolution,
  type GeoPoint,
  type H3Flow,
  type ResolutionInput
} from "@h3-toolkit/core";

export interface TrajectoryPoint extends GeoPoint {
  timestamp?: string;
  weight?: number;
}

export interface TrajectoryCell {
  cell: string;
  timestamp?: string;
  weight?: number;
}

export function trajectoryToCells(points: TrajectoryPoint[], input: ResolutionInput): TrajectoryCell[] {
  const resolution = resolveResolution(input);
  return points.map(({ longitude, latitude, timestamp, weight }) => ({
    cell: pointToCell({ longitude, latitude }, resolution).index,
    ...(timestamp === undefined ? {} : { timestamp }),
    ...(weight === undefined ? {} : { weight })
  }));
}

export function compressTrajectory<T extends { cell: string }>(trajectory: T[]): T[] {
  return trajectory.filter((item, index) => index === 0 || item.cell !== trajectory[index - 1]!.cell);
}

export function calculateOD(trajectory: { cell: string; weight?: number }[]): H3Flow | null {
  const compressed = compressTrajectory(trajectory);
  if (compressed.length < 2) return null;
  return {
    origin: compressed[0]!.cell,
    destination: compressed.at(-1)!.cell,
    count: 1,
    weight: compressed.reduce((sum, point) => sum + (point.weight ?? 0), 0)
  };
}

export function aggregateFlow(flows: H3Flow[], directed = true): H3Flow[] {
  const groups = new Map<string, H3Flow>();
  for (const flow of flows) {
    assertCell(flow.origin);
    assertCell(flow.destination);
    if (getCellResolution(flow.origin) !== getCellResolution(flow.destination)) {
      throw new H3ToolkitError("FLOW_RESOLUTION_MISMATCH", "Flow endpoints must use the same H3 resolution");
    }
    if (
      !Number.isInteger(flow.count) ||
      flow.count < 0 ||
      (flow.weight !== undefined && !Number.isFinite(flow.weight))
    ) {
      throw new H3ToolkitError("INVALID_FLOW_VALUE", "Flow count and weight must be finite non-negative values");
    }
    const [origin, destination] =
      directed || flow.origin <= flow.destination ? [flow.origin, flow.destination] : [flow.destination, flow.origin];
    const key = `${origin}\u0000${destination}`;
    const current = groups.get(key) ?? { origin, destination, count: 0, weight: 0 };
    current.count += flow.count;
    current.weight = (current.weight ?? 0) + (flow.weight ?? 0);
    groups.set(key, current);
  }
  return [...groups.values()];
}

export function trajectoryToFlow(points: TrajectoryPoint[], resolution: ResolutionInput): H3Flow | null {
  return calculateOD(trajectoryToCells(points, resolution));
}
