import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pnpmInvocation } from "./platform-command.mjs";

const root = resolve(process.cwd());
const directory = await mkdtemp(resolve(tmpdir(), "h3-api-production-deploy-"));
let child;
try {
  const dockerfile = await readFile(resolve(root, "Dockerfile"), "utf8");
  assert.match(
    dockerfile,
    /pnpm --config\.inject-workspace-packages=true --filter @h3-toolkit\/api deploy --prod \/prod\/api/
  );
  assert.match(dockerfile, /COPY --from=build --chown=node:node \/prod\/api \.\//);
  assert.doesNotMatch(dockerfile, /COPY --from=build \/app\/node_modules/);
  assert.match(dockerfile, /^USER node$/m);

  const invocation = pnpmInvocation([
    "--config.inject-workspace-packages=true",
    "--filter",
    "@h3-toolkit/api",
    "deploy",
    "--prod",
    directory
  ]);
  execFileSync(invocation.command, invocation.args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 16 * 1024 * 1024
  });
  const packageJson = JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
  assert.equal(packageJson.name, "@h3-toolkit/api");
  await stat(resolve(directory, "dist/server.js"));
  await assert.rejects(stat(resolve(directory, "node_modules/vitest")));
  await assert.rejects(stat(resolve(directory, "node_modules/typescript")));
  const bytes = await directoryBytes(directory);
  assert.ok(bytes < 50 * 1024 * 1024, `Production deploy exceeds 50 MiB: ${bytes}`);

  const port = await freePort();
  let logs = "";
  child = spawn(process.execPath, ["dist/server.js"], {
    cwd: directory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      H3_TOOLKIT_TEST_SHUTDOWN_IPC: "YES"
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  child.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  const response = await waitForReady(port, child, () => logs);
  const readiness = await response.json();
  assert.equal(readiness.status, "ready");
  const exitPromise = new Promise((resolveExit) => child.once("exit", (code, signal) => resolveExit({ code, signal })));
  if (process.platform === "win32") child.send("shutdown");
  else child.kill("SIGTERM");
  const outcome = await Promise.race([
    exitPromise,
    new Promise((resolveTimeout) => setTimeout(() => resolveTimeout(null), 3000))
  ]);
  assert.deepEqual(outcome, { code: 0, signal: null });
  child = undefined;
  console.log(
    JSON.stringify(
      {
        status: "passed",
        deployBytes: bytes,
        maxDeployBytes: 50 * 1024 * 1024,
        devDependenciesExcluded: true,
        readiness: true,
        gracefulShutdown: true,
        shutdownTrigger: process.platform === "win32" ? "test-ipc" : "SIGTERM",
        containerUser: "node"
      },
      null,
      2
    )
  );
} finally {
  if (child?.exitCode === null) child.kill("SIGKILL");
  await rm(directory, { recursive: true, force: true });
}

async function waitForReady(port, processHandle, logs) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error(`Production deploy exited before readiness:\n${logs()}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/ready`);
      if (response.ok) return response;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Production deploy did not become ready:\n${logs()}`);
}

async function directoryBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(path);
    else if (entry.isFile()) total += (await stat(path)).size;
  }
  return total;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose()))
  );
  return port;
}
