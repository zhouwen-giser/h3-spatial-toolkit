import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";

const port = Number(process.env.SMOKE_PORT ?? 3310);
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

const server = spawn(process.execPath, ["apps/api/dist/server.js"], {
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
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
  assert.deepEqual(health, { status: "ok", engine: "h3-js@4.5.0", toolkitVersion: "0.2.0" });
  const readiness = await getJson("/ready");
  assert.deepEqual(readiness, {
    status: "ready",
    checks: { h3: "ready", database: "not-required" },
    toolkitVersion: "0.2.0"
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
      { status: "passed", cli: ["point", "polygon-csv"], apiPaths: paths.length, readiness: true, port },
      null,
      2
    )
  );
} finally {
  const exitPromise = new Promise((resolveExit) =>
    server.once("exit", (code, signal) => resolveExit({ code, signal }))
  );
  if (server.exitCode === null) server.kill("SIGTERM");
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
}

if (shutdownFailure) throw shutdownFailure;

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
  return result;
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
