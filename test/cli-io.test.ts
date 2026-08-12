import { describe, expect, it } from "vitest";
import { runCli, type CliIo } from "../apps/cli/src/index.js";
import {
  H3_CELL_SCHEMA,
  H3_FLOW_SCHEMA,
  H3_METRIC_SCHEMA,
  H3_TIME_METRIC_SCHEMA,
  parseCsv,
  toCsv
} from "@h3-toolkit/io";

const area = {
  type: "Polygon" as const,
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

function memoryIo(files: Record<string, string> = {}) {
  let stdout = "",
    stderr = "";
  const io: CliIo = {
    read: async (path) => files[path] ?? "",
    write: async (path, content) => {
      files[path] = content;
    },
    stdout: (content) => {
      stdout += content;
    },
    stderr: (content) => {
      stderr += content;
    }
  };
  return { io, files, stdout: () => stdout, stderr: () => stderr };
}

describe("CLI and IO", () => {
  it("runs point and emits JSON", async () => {
    const memory = memoryIo();
    expect(await runCli(["point", "--lng", "139.7671", "--lat", "35.6812", "--resolution", "9"], memory.io)).toBe(0);
    expect(JSON.parse(memory.stdout()).index).toBe("892f5a32d97ffff");
  });

  it("runs polygon from a real GeoJSON document", async () => {
    const memory = memoryIo({
      "area.geojson": JSON.stringify(area)
    });
    expect(
      await runCli(["polygon", "--input", "area.geojson", "--resolution", "9", "--format", "csv"], memory.io)
    ).toBe(0);
    expect(memory.stdout().split("\n")[0]).toBe("cell");
  });

  it("runs CSV aggregation and file output", async () => {
    const memory = memoryIo({ "points.csv": "longitude,latitude,value\n139.7671,35.6812,10\n139.7672,35.6813,20\n" });
    expect(
      await runCli(
        ["aggregate", "--input", "points.csv", "--resolution", "9", "--operation", "sum", "--output", "result.json"],
        memory.io
      )
    ).toBe(0);
    expect(JSON.parse(memory.files["result.json"]!)[0].value).toBe(30);
  });

  it("runs neighbors, coverage and flow", async () => {
    const neighbors = memoryIo();
    expect(await runCli(["neighbors", "--cell", "892f5a32d97ffff", "--k", "1"], neighbors.io)).toBe(0);
    expect(JSON.parse(neighbors.stdout())).toHaveLength(7);

    const coverage = memoryIo({
      "coverage.json": JSON.stringify({
        area,
        visitedPoints: [{ longitude: 139.7671, latitude: 35.6812 }]
      })
    });
    expect(await runCli(["coverage", "--input", "coverage.json", "--resolution", "9"], coverage.io)).toBe(0);
    expect(JSON.parse(coverage.stdout())).toMatchObject({ resolution: 9, visitedRequiredCount: 1 });

    const flow = memoryIo({
      "flow.json": JSON.stringify([
        [
          { longitude: 139.75, latitude: 35.67 },
          { longitude: 139.78, latitude: 35.69 }
        ]
      ])
    });
    expect(await runCli(["flow", "--input", "flow.json", "--resolution", "9"], flow.io)).toBe(0);
    expect(JSON.parse(flow.stdout())).toHaveLength(1);
  });

  it("returns deterministic nonzero errors for invalid invocations of all six commands", async () => {
    const cases = [
      { argv: ["point", "--lng", "139.7671", "--resolution", "9"], error: "Missing --lat\n" },
      { argv: ["polygon", "--resolution", "9"], error: "Missing --input\n" },
      { argv: ["neighbors", "--cell", "not-a-cell"], error: "Invalid H3 cell index\n" },
      {
        argv: ["aggregate", "--input", "points.csv", "--resolution", "9", "--operation", "median"],
        error: "--operation must be one of count, sum, average, min, max, weightedAverage, density, distinctCount\n"
      },
      { argv: ["coverage", "--input", "coverage.json"], error: "Missing --resolution\n" },
      { argv: ["flow", "--resolution", "9"], error: "Missing --input\n" }
    ];

    for (const testCase of cases) {
      const memory = memoryIo({
        "points.csv": "longitude,latitude\n139.7671,35.6812\n",
        "coverage.json": JSON.stringify({ area })
      });
      expect(await runCli(testCase.argv, memory.io), testCase.argv[0]).toBe(1);
      expect(memory.stderr(), testCase.argv[0]).toBe(testCase.error);
      expect(memory.stdout(), testCase.argv[0]).toBe("");
    }
  });

  it("emits a useful error", async () => {
    const memory = memoryIo();
    expect(await runCli(["unknown"], memory.io)).toBe(1);
    expect(memory.stderr()).toContain("Unknown command");
  });

  it("round-trips quoted CSV and preserves string cells", () => {
    const csv = toCsv([{ cell: "abc", label: "a,b" }, "def"]);
    expect(parseCsv(csv)[0]).toEqual({ cell: "abc", label: "a,b" });
    expect(csv).toContain("def");
  });

  it("ships four formal schemas", () => {
    expect(H3_CELL_SCHEMA.required).toContain("index");
    expect(H3_METRIC_SCHEMA.required).toContain("metric");
    expect(H3_TIME_METRIC_SCHEMA.required).toContain("timestamp");
    expect(H3_FLOW_SCHEMA.required).toContain("origin");
  });
});
