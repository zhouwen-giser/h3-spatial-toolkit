import { aggregateCount } from "@h3-toolkit/aggregation";
import { cellToBoundary, pointToCell } from "@h3-toolkit/core";
import { calculateCoverage } from "@h3-toolkit/coverage";
import { trajectoryToFlow } from "@h3-toolkit/flow";
import { polygonToCells } from "@h3-toolkit/geometry";
import { neighbors } from "@h3-toolkit/neighborhood";

const tokyo = { longitude: 139.7671, latitude: 35.6812 };
const cell = pointToCell(tokyo, "STREET");
console.log({ cell, boundary: cellToBoundary(cell.index), neighbors: neighbors(cell.index) });

const area: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [139.75, 35.67],
      [139.78, 35.67],
      [139.78, 35.69],
      [139.75, 35.69],
      [139.75, 35.67]
    ]
  ]
};
const cells = polygonToCells(area, 9);
console.log(aggregateCount([{ ...tokyo }, { longitude: 139.768, latitude: 35.682 }], 9));
console.log(calculateCoverage({ area, resolution: 9, visitedCells: cells.slice(0, 5) }));
console.log(trajectoryToFlow([tokyo, { longitude: 139.78, latitude: 35.69 }], 9));
