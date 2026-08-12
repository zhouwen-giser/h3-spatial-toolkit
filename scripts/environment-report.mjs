import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus } from "node:os";
import { resolve } from "node:path";

const probes = {
  docker: ["docker", ["--version"]],
  compose: ["docker", ["compose", "version"]],
  psql: ["psql", ["--version"]],
  git: ["git", ["--version"]],
  zip: ["zip", ["-v"]],
  unzip: ["unzip", ["-v"]],
  shellcheck: ["shellcheck", ["--version"]],
  chromium: ["chromium", ["--version"]],
  chrome: ["google-chrome", ["--version"]],
  firefox: ["firefox", ["--version"]]
};

const capabilities = {};
for (const [name, [command, args]] of Object.entries(probes)) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  capabilities[name] = {
    available: !result.error && result.status === 0,
    version: firstLine(result.stdout || result.stderr)
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch, cpus: cpus().length },
  capabilities,
  executableGateFamilies: {
    local: true,
    apiCli: true,
    database: capabilities.docker.available && capabilities.compose.available,
    localPsql: capabilities.psql.available,
    realBrowser: capabilities.chromium.available || capabilities.chrome.available || capabilities.firefox.available,
    shellStaticAnalysis: capabilities.shellcheck.available
  }
};

if (process.argv.includes("--write")) {
  const directory = resolve(process.cwd(), "output/acceptance/environment");
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "capabilities.json"), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));

function firstLine(value) {
  return String(value ?? "")
    .split(/\r?\n/, 1)[0]
    .trim();
}
