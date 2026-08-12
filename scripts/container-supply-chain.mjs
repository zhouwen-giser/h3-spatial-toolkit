import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const root = resolve(process.cwd());
const outputDirectory = resolve(root, "output/acceptance/container-supply-chain");
const expectedScoutVersion = "v1.22.0";
const services = [
  { name: "api", image: "h3-spatial-toolkit-api:latest", expectedUser: "node" },
  { name: "postgres", image: "h3-spatial-toolkit-postgres:latest", expectedUser: "" }
];

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) await main();

async function main() {
  if (process.argv[2] !== "--write") throw new Error("Usage: container-supply-chain.mjs --write");
  await mkdir(outputDirectory, { recursive: true });
  const scoutVersionOutput = await run("docker", ["scout", "version"]);
  const scoutVersion = parseScoutVersion(scoutVersionOutput);
  if (scoutVersion !== expectedScoutVersion) {
    throw new Error(`Docker Scout version ${scoutVersion} does not match pinned ${expectedScoutVersion}`);
  }

  const pins = await readBuildPins();
  const expectedRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (
    execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
      cwd: root,
      encoding: "utf8"
    }).trim()
  ) {
    throw new Error("Refusing container certification from a dirty tracked worktree");
  }
  const results = [];
  for (const service of services) {
    const identity = JSON.parse(await run("docker", ["image", "inspect", service.image]))[0];
    const labels = identity.Config?.Labels ?? {};
    if (labels["org.opencontainers.image.revision"] !== expectedRevision) {
      throw new Error(`${service.image} is not bound to source revision ${expectedRevision}`);
    }
    const expectedBase = service.name === "api" ? pins.apiBase : pins.databaseBase;
    if (labels["org.opencontainers.image.base.name"] !== expectedBase) {
      throw new Error(`${service.image} is not bound to pinned base ${expectedBase}`);
    }
    const sbomPath = resolve(outputDirectory, `${service.name}.sbom.cdx.json`);
    const sarifPath = resolve(outputDirectory, `${service.name}.vulnerabilities.sarif.json`);
    await run("docker", ["scout", "sbom", "--format", "cyclonedx", "--output", sbomPath, `local://${service.image}`]);
    await run("docker", [
      "scout",
      "cves",
      "--only-severity",
      "critical,high",
      "--format",
      "sarif",
      "--output",
      sarifPath,
      `local://${service.image}`
    ]);

    const sbom = JSON.parse(await readFile(sbomPath, "utf8"));
    const sarif = JSON.parse(await readFile(sarifPath, "utf8"));
    const findings = summarizeSarif(sarif);
    const inspection = await inspectRuntime(service);
    results.push({
      service: service.name,
      image: service.image,
      imageId: identity.Id,
      sourceRevision: expectedRevision,
      baseImage: expectedBase,
      repoDigests: identity.RepoDigests ?? [],
      platform: `${identity.Os}/${identity.Architecture}`,
      sizeBytes: identity.Size,
      configuredUser: identity.Config?.User ?? "",
      expectedUser: service.expectedUser,
      userCheck: (identity.Config?.User ?? "") === service.expectedUser ? "PASS" : "FAIL",
      inspection,
      sbom: {
        path: relative(sbomPath),
        sha256: await sha256(sbomPath),
        components: sbom.components?.length ?? 0
      },
      vulnerabilities: { path: relative(sarifPath), sha256: await sha256(sarifPath), ...findings }
    });
  }

  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scanner: { name: "Docker Scout", version: scoutVersion, pinned: true },
    buildPins: pins,
    severityThreshold: ["CRITICAL", "HIGH"],
    suppressions: [],
    status: results.some(
      (item) => item.vulnerabilities.total > 0 || item.userCheck === "FAIL" || item.inspection.status === "FAIL"
    )
      ? "FAIL"
      : "PASS",
    images: results,
    blocked: [
      "registry identity and immutable publication digest",
      "keyless or managed-key image signing",
      "registry-backed provenance verification"
    ]
  };

  const summaryPath = resolve(outputDirectory, "summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "PASS") process.exitCode = 2;
}

export function summarizeSarif(sarif) {
  const rules = sarif?.runs?.flatMap((run) => run.tool?.driver?.rules ?? []) ?? [];
  const findings = rules.map((rule) => ({
    cve: rule.id,
    severity: String(rule.properties?.cvssV3_severity ?? "UNSPECIFIED").toUpperCase(),
    package: rule.properties?.purls?.[0] ?? "unknown",
    fixedVersion: rule.properties?.fixed_version ?? "not fixed"
  }));
  const critical = findings.filter((item) => item.severity === "CRITICAL").length;
  const high = findings.filter((item) => item.severity === "HIGH").length;
  const fixable = findings.filter((item) => item.fixedVersion !== "not fixed").length;
  const vulnerablePackages = new Set(findings.map((item) => item.package)).size;
  return {
    total: findings.length,
    vulnerablePackages,
    critical,
    high,
    fixable,
    unfixable: findings.length - fixable,
    findings
  };
}

function parseScoutVersion(output) {
  return output.match(/version:\s*(v[^\s]+)/)?.[1] ?? "unknown";
}

async function run(command, args) {
  const { stdout, stderr } = await execFile(command, args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  if (stderr.trim()) process.stderr.write(stderr);
  return stdout;
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

function relative(path) {
  return path.slice(root.length + 1).replaceAll("\\", "/");
}

async function readBuildPins() {
  const [apiDockerfile, databaseDockerfile] = await Promise.all([
    readFile(resolve(root, "Dockerfile"), "utf8"),
    readFile(resolve(root, "database/Dockerfile"), "utf8")
  ]);
  return {
    apiBase: requiredArgument(apiDockerfile, "NODE_IMAGE"),
    databaseBase: requiredArgument(databaseDockerfile, "POSTGIS_IMAGE"),
    h3PgVersion: requiredArgument(databaseDockerfile, "H3_PG_VERSION"),
    h3PgArchiveSha256: requiredArgument(databaseDockerfile, "H3_PG_SHA256")
  };
}

function requiredArgument(dockerfile, name) {
  const value = dockerfile.match(new RegExp(`^ARG ${name}=(.+)$`, "m"))?.[1]?.trim();
  if (!value) throw new Error(`Dockerfile build argument ${name} is not pinned`);
  return value;
}

async function inspectRuntime(service) {
  const script =
    service.name === "api"
      ? String.raw`set -eu
for command in npm npx corepack pnpm pnpx yarn yarnpkg gcc g++ make cmake; do
  if command -v "$command" >/dev/null 2>&1; then echo "unexpected_command=$command"; exit 1; fi
done
if find /app -xdev -type f \( -name .env -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' -o -name id_rsa -o -name id_ed25519 \) | grep -q .; then exit 1; fi
if grep -R -I -E -q 'BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY|AKIA[0-9A-Z]{16}' /app; then exit 1; fi
test "$(id -u)" -ne 0
echo PASS`
      : String.raw`set -eu
for command in gcc g++ cc make cmake curl; do
  if command -v "$command" >/dev/null 2>&1; then echo "unexpected_command=$command"; exit 1; fi
done
test ! -e /tmp/h3-pg.zip
test ! -d /var/lib/apt/lists || test -z "$(find /var/lib/apt/lists -mindepth 1 -maxdepth 1 -print -quit)"
test ! -d /var/cache/apk || test -z "$(find /var/cache/apk -mindepth 1 -maxdepth 1 -print -quit)"
echo PASS`;
  const result = await run("docker", ["run", "--rm", "--entrypoint", "sh", service.image, "-c", script]);
  return {
    status: result.trim().endsWith("PASS") ? "PASS" : "FAIL",
    checks:
      service.name === "api"
        ? ["non-root", "no package managers", "no build tools", "no sensitive filenames or key patterns"]
        : ["no H3 build tools", "no H3 source archive", "no package-manager index cache"]
  };
}
