import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { H3_TOOLKIT_VERSION } from "../packages/core/dist/index.js";

const port = Number(process.env.SMOKE_PORT ?? 3310);
const smokeDirectory = mkdtempSync(join(tmpdir(), "h3-toolkit-cli-smoke-"));
const coverageInput = join(smokeDirectory, "coverage.json");
const flowInput = join(smokeDirectory, "flow.json");
const area = {
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
writeFileSync(
  coverageInput,
  JSON.stringify({ area, visitedPoints: [{ longitude: 139.7671, latitude: 35.6812 }] }),
  "utf8"
);
writeFileSync(
  flowInput,
  JSON.stringify([
    [
      { longitude: 139.75, latitude: 35.67 },
      { longitude: 139.78, latitude: 35.69 }
    ]
  ]),
  "utf8"
);
process.once("exit", cleanupSmokeDirectory);

const cliPoint = run(process.execPath, [
  "apps/cli/dist/index.js",
  "point",
  "--lng",
  "139.7671",
  "--lat",
  "35.6812",
  "--resolution",
  "9"
]);
const point = JSON.parse(cliPoint.stdout);
assert.equal(point.index, "892f5a32d97ffff");
assert.equal(point.resolution, 9);

const cliPolygon = run(process.execPath, [
  "apps/cli/dist/index.js",
  "polygon",
  "--input",
  "database/fixtures/tokyo-area.geojson",
  "--resolution",
  "9",
  "--format",
  "csv"
]);
assert.match(cliPolygon.stdout, /^cell\n[0-9a-f]{15}/);

const cliNeighbors = run(process.execPath, [
  "apps/cli/dist/index.js",
  "neighbors",
  "--cell",
  "892f5a32d97ffff",
  "--k",
  "1"
]);
assert.equal(JSON.parse(cliNeighbors.stdout).length, 7);

const cliAggregate = run(process.execPath, [
  "apps/cli/dist/index.js",
  "aggregate",
  "--input",
  "database/fixtures/points.csv",
  "--resolution",
  "9",
  "--operation",
  "sum"
]);
assert.equal(
  JSON.parse(cliAggregate.stdout).reduce((sum, metric) => sum + metric.value, 0),
  35
);

const cliCoverage = run(process.execPath, [
  "apps/cli/dist/index.js",
  "coverage",
  "--input",
  coverageInput,
  "--resolution",
  "9"
]);
assert.equal(JSON.parse(cliCoverage.stdout).visitedRequiredCount, 1);

const cliFlow = run(process.execPath, ["apps/cli/dist/index.js", "flow", "--input", flowInput, "--resolution", "9"]);
assert.equal(JSON.parse(cliFlow.stdout).length, 1);

const invalidAggregate = spawnSync(
  process.execPath,
  [
    "apps/cli/dist/index.js",
    "aggregate",
    "--input",
    "database/fixtures/points.csv",
    "--resolution",
    "9",
    "--operation",
    "median"
  ],
  { encoding: "utf8" }
);
assert.equal(invalidAggregate.status, 1);
assert.equal(invalidAggregate.stdout, "");
assert.equal(
  invalidAggregate.stderr,
  "--operation must be one of count, sum, average, min, max, weightedAverage, density, distinctCount\n"
);

const server = spawn(process.execPath, ["apps/api/dist/server.js"], {
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), H3_TOOLKIT_TEST_SHUTDOWN_IPC: "YES" },
  stdio: ["ignore", "pipe", "pipe", "ipc"]
});
let logs = "";
let shutdownFailure;
server.stdout.on("data", (chunk) => {
  logs += chunk;
});
server.stderr.on("data", (chunk) => {
  logs += chunk;
});

try {
  await waitForHealth();
  const health = await getJson("/health");
  assert.deepEqual(health, { status: "ok", engine: "h3-js@4.5.0", toolkitVersion: H3_TOOLKIT_VERSION });
  const readiness = await getJson("/ready");
  assert.deepEqual(readiness, {
    status: "ready",
    checks: { h3: "ready", database: "not-required" },
    toolkitVersion: H3_TOOLKIT_VERSION
  });

  const response = await fetch(`http://127.0.0.1:${port}/v1/h3/index`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ points: [{ longitude: 139.7671, latitude: 35.6812 }], resolution: 9 })
  });
  assert.equal(response.status, 200);
  const indexed = await response.json();
  assert.equal(indexed.data[0].index, "892f5a32d97ffff");

  const openapi = await getJson("/documentation/json");
  const paths = Object.keys(openapi.paths).sort();
  assert.deepEqual(paths, [
    "/health",
    "/metrics",
    "/ready",
    "/v1/h3/aggregate",
    "/v1/h3/coverage",
    "/v1/h3/flow",
    "/v1/h3/index",
    "/v1/h3/neighbors",
    "/v1/h3/polygon/cover"
  ]);
  console.log(
    JSON.stringify(
      {
        status: "passed",
        cli: ["point", "polygon-csv", "neighbors", "aggregate", "coverage", "flow", "aggregate-invalid"],
        apiPaths: paths.length,
        readiness: true,
        shutdownTrigger: process.platform === "win32" ? "test-ipc" : "SIGTERM",
        port
      },
      null,
      2
    )
  );
} finally {
  const exitPromise = new Promise((resolveExit) =>
    server.once("exit", (code, signal) => resolveExit({ code, signal }))
  );
  if (server.exitCode === null) {
    if (process.platform === "win32") server.send("shutdown");
    else server.kill("SIGTERM");
  }
  const outcome = await Promise.race([
    exitPromise,
    new Promise((resolveTimeout) => setTimeout(() => resolveTimeout(null), 3000))
  ]);
  if (outcome === null) {
    server.kill("SIGKILL");
    shutdownFailure = new Error(`API did not complete graceful shutdown within 3000ms:\n${logs}`);
  } else if (outcome.code !== 0 || outcome.signal !== null) {
    shutdownFailure = new Error(`API graceful shutdown was not clean: ${JSON.stringify(outcome)}\n${logs}`);
  }
  cleanupSmokeDirectory();
}

if (shutdownFailure) throw shutdownFailure;

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
  return result;
}

function cleanupSmokeDirectory() {
  rmSync(smokeDirectory, { recursive: true, force: true });
}

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  assert.equal(response.status, 200);
  return response.json();
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`API exited before health check:\n${logs}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      /* server is still starting */
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`API did not become healthy:\n${logs}`);
}
