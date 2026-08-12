import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  cellToBoundary,
  cellToLatLng,
  cellToParent,
  getPentagons,
  isPentagon,
  latLngToCell,
  polygonToCells
} from "h3-js";

const root = resolve(process.cwd());
const outputPath = resolve(root, "database/fixtures/h3-cross-engine-golden.json");
const rootPackage = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const engineVersion = rootPackage.devDependencies?.["h3-js"];
if (typeof engineVersion !== "string" || !/^\d+\.\d+\.\d+$/.test(engineVersion)) {
  throw new Error("package.json must pin an exact h3-js version before generating Golden data");
}

const pentagonCell = getPentagons(1)[0];
if (!pentagonCell) throw new Error("h3-js returned no resolution 1 pentagon");
const [pentagonLatitude, pentagonLongitude] = cellToLatLng(pentagonCell);

const pointSpecs = [
  { id: "tokyo-station-r9", longitude: 139.7671, latitude: 35.6812, resolution: 9, parentResolution: 5 },
  { id: "tokyo-global-r0", longitude: 139.7671, latitude: 35.6812, resolution: 0 },
  { id: "dateline-east-r15", longitude: 179.999, latitude: 0, resolution: 15, parentResolution: 9 },
  { id: "north-polar-r5", longitude: 45, latitude: 89.9, resolution: 5, parentResolution: 0 },
  { id: "south-polar-r5", longitude: -135, latitude: -89.9, resolution: 5, parentResolution: 0 },
  {
    id: "pentagon-center-r1",
    longitude: pentagonLongitude,
    latitude: pentagonLatitude,
    resolution: 1,
    parentResolution: 0
  }
];

const polygonSpecs = [
  {
    id: "tokyo-simple-r9",
    resolution: 9,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [139.75, 35.675],
          [139.77, 35.675],
          [139.77, 35.69],
          [139.75, 35.69],
          [139.75, 35.675]
        ]
      ]
    }
  },
  {
    id: "tokyo-hole-r9",
    resolution: 9,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [139.75, 35.675],
          [139.78, 35.675],
          [139.78, 35.7],
          [139.75, 35.7],
          [139.75, 35.675]
        ],
        [
          [139.76, 35.683],
          [139.77, 35.683],
          [139.77, 35.692],
          [139.76, 35.692],
          [139.76, 35.683]
        ]
      ]
    }
  },
  {
    id: "tokyo-multipolygon-r9",
    resolution: 9,
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [139.75, 35.675],
            [139.758, 35.675],
            [139.758, 35.683],
            [139.75, 35.683],
            [139.75, 35.675]
          ]
        ],
        [
          [
            [139.772, 35.69],
            [139.78, 35.69],
            [139.78, 35.698],
            [139.772, 35.698],
            [139.772, 35.69]
          ]
        ]
      ]
    }
  },
  {
    id: "antimeridian-r5",
    resolution: 5,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [179.7, -0.2],
          [-179.7, -0.2],
          [-179.7, 0.2],
          [179.7, 0.2],
          [179.7, -0.2]
        ]
      ]
    }
  }
];

const fixture = {
  schemaVersion: 1,
  generatedAt: "2026-08-12T00:00:00.000Z",
  engine: "h3-js",
  engineVersion,
  coordinateOrder: "longitude-latitude",
  boundaryToleranceDegrees: 1e-7,
  pointCases: pointSpecs.map((spec) => {
    const expectedCell = latLngToCell(spec.latitude, spec.longitude, spec.resolution);
    const boundary = cellToBoundary(expectedCell).map(([latitude, longitude]) => [longitude, latitude]);
    return {
      ...spec,
      expectedCell,
      expectedParent:
        spec.parentResolution === undefined ? undefined : cellToParent(expectedCell, spec.parentResolution),
      expectedPentagon: isPentagon(expectedCell),
      expectedBoundary: [...boundary, boundary[0]]
    };
  }),
  polygonCases: polygonSpecs.map((spec) => {
    const expectedCells = geometryCells(spec.geometry, spec.resolution);
    return { ...spec, expectedCellCount: expectedCells.length, expectedCells };
  })
};

const serialized = `${JSON.stringify(fixture, null, 2)}\n`;
const mode = process.argv[2] ?? "--check";
if (mode === "--write") {
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, serialized);
  console.log(JSON.stringify(summary("written"), null, 2));
} else if (mode === "--check") {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== serialized) {
    console.error("Golden fixture is missing or stale; run pnpm golden:write and review the diff");
    process.exitCode = 1;
  } else console.log(JSON.stringify(summary("passed"), null, 2));
} else throw new Error("Usage: generate-golden-fixture.mjs [--check|--write]");

function geometryCells(geometry, resolution) {
  const cells =
    geometry.type === "Polygon"
      ? polygonToCells(geometry.coordinates, resolution, true)
      : geometry.coordinates.flatMap((polygon) => polygonToCells(polygon, resolution, true));
  return [...new Set(cells)].sort();
}

function summary(status) {
  return {
    status,
    engineVersion,
    pointCases: fixture.pointCases.length,
    polygonCases: fixture.polygonCases.length,
    polygonCells: fixture.polygonCases.reduce((sum, item) => sum + item.expectedCellCount, 0),
    output: "database/fixtures/h3-cross-engine-golden.json"
  };
}
