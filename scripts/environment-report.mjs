import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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
  edge: ["microsoft-edge", ["--version"]],
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
if (process.platform === "win32") probeWindowsBrowsers(capabilities);

const report = {
  generatedAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch, cpus: cpus().length },
  capabilities,
  executableGateFamilies: {
    local: true,
    apiCli: true,
    database: capabilities.docker.available && capabilities.compose.available,
    localPsql: capabilities.psql.available,
    realBrowser:
      capabilities.chromium.available ||
      capabilities.chrome.available ||
      capabilities.edge.available ||
      capabilities.firefox.available,
    shellStaticAnalysis: capabilities.shellcheck.available || capabilities.docker.available
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

function probeWindowsBrowsers(capabilities) {
  const candidates = {
    chrome: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    ],
    edge: [
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    ],
    firefox: [
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe"
    ]
  };
  for (const [name, paths] of Object.entries(candidates)) {
    const path = paths.find(existsSync);
    if (!path) continue;
    const escaped = path.replaceAll("'", "''");
    const version = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", `(Get-Item -LiteralPath '${escaped}').VersionInfo.ProductVersion`],
      { encoding: "utf8" }
    );
    capabilities[name] = {
      available: true,
      version: firstLine(version.stdout) || "installed",
      executable: path
    };
  }
}
