import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { evaluateReleasePolicy } from "./release-policy.mjs";

const root = resolve(process.cwd());
const template = JSON.parse(await readFile(resolve(root, "template.json"), "utf8"));
const epoch = Number(process.env.SOURCE_DATE_EPOCH ?? template.releaseEpoch);
if (!Number.isInteger(epoch) || epoch < 315532800)
  throw new Error("SOURCE_DATE_EPOCH must be an integer at or after 1980-01-01");

execFileSync(process.execPath, ["--experimental-strip-types", "scripts/create-manifest.ts"], {
  cwd: root,
  env: { ...process.env, SOURCE_DATE_EPOCH: String(epoch) },
  stdio: "inherit"
});

const manifest = JSON.parse(await readFile(resolve(root, "MANIFEST.json"), "utf8"));
const failures = [];
const releasePolicy = await evaluateReleasePolicy(root);
failures.push(...releasePolicy.failures);
for (const file of manifest.files) {
  const bytes = await readFile(resolve(root, file.path));
  if (bytes.length !== file.size || sha256(bytes) !== file.sha256) failures.push(`manifest mismatch: ${file.path}`);
}

const temp = await mkdtemp(resolve(tmpdir(), "h3-toolkit-release-"));
const releaseDirectory = resolve(root, "release");
const archiveName = `${template.templateName}-v${template.templateVersion}.zip`;
const first = resolve(temp, `first-${archiveName}`);
const second = resolve(temp, `second-${archiveName}`);

try {
  await createArchive(first);
  await createArchive(second);
  const firstBytes = await readFile(first);
  const secondBytes = await readFile(second);
  if (sha256(firstBytes) !== sha256(secondBytes)) failures.push("release ZIP is not bit-reproducible");

  const list = execFileSync("unzip", ["-Z1", first], { encoding: "utf8" }).trim().split(/\r?\n/);
  const prefix = `${template.releaseRoot}/`;
  const forbidden = list.filter((path) => {
    if (!path.startsWith(prefix)) return true;
    const relativePath = path.slice(prefix.length);
    return (
      /(?:^|\/)(?:node_modules|dist)(?:\/|$)/.test(relativePath) ||
      /^(?:coverage|release|output)(?:\/|$)/.test(relativePath) ||
      /(?:^|\/)(?:\.env|[^/]+\.(?:pem|key|p12|pfx))$/.test(relativePath)
    );
  });
  if (forbidden.length) failures.push(`forbidden ZIP entries: ${forbidden.join(", ")}`);
  for (const file of [...manifest.files.map((item) => `${prefix}${item.path}`), `${prefix}MANIFEST.json`]) {
    if (!list.includes(file)) failures.push(`ZIP missing manifest entry: ${file}`);
  }
  const test = spawnSync("unzip", ["-t", first], { encoding: "utf8" });
  if (test.status !== 0) failures.push(`unzip integrity failed: ${test.stderr}`);

  if (failures.length) {
    console.error(JSON.stringify({ status: "failed", failures }, null, 2));
    process.exitCode = 1;
  } else {
    await mkdir(releaseDirectory, { recursive: true });
    const destination = resolve(releaseDirectory, archiveName);
    await copyFile(first, destination);
    const digest = sha256(firstBytes);
    const summaryName = `${template.templateName}-v${template.templateVersion}-RELEASE-SUMMARY.json`;
    const summary = {
      schemaVersion: 1,
      generatedAt: new Date(epoch * 1000).toISOString(),
      projectVersion: releasePolicy.projectVersion,
      templateVersion: releasePolicy.templateVersion,
      classification: releasePolicy.classification,
      sourceArchive: { name: archiveName, bytes: firstBytes.length, sha256: digest },
      manifest: { files: manifest.fileCount, generatedAt: manifest.generatedAt },
      gateSummary: releasePolicy.gateSummary,
      productionUnresolved: releasePolicy.productionUnresolved,
      blockers: releasePolicy.blockers
    };
    const summaryBytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`);
    await writeFile(resolve(releaseDirectory, summaryName), summaryBytes);
    const checksumName = `${template.templateName}-v${template.templateVersion}-SHA256SUMS.txt`;
    await writeFile(
      resolve(releaseDirectory, checksumName),
      `${digest}  ${archiveName}\n${sha256(summaryBytes)}  ${summaryName}\n`
    );
    console.log(
      JSON.stringify(
        {
          status: "passed",
          classification: releasePolicy.classification,
          archive: `release/${archiveName}`,
          summary: `release/${summaryName}`,
          sha256: digest,
          bytes: firstBytes.length,
          manifestFiles: manifest.fileCount,
          reproducible: true
        },
        null,
        2
      )
    );
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}

async function createArchive(destination) {
  const staging = await mkdtemp(resolve(temp, "stage-"));
  const releaseRoot = resolve(staging, template.releaseRoot);
  const files = [...manifest.files.map((item) => item.path), "MANIFEST.json"].sort();
  for (const path of files) {
    const source = resolve(root, path);
    const target = resolve(releaseRoot, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    const sourceMode = (await stat(source)).mode & 0o111;
    if (sourceMode) {
      const { chmod } = await import("node:fs/promises");
      await chmod(target, 0o755);
    }
    await utimes(target, epoch, epoch);
  }
  const entries = files.map((path) => `${template.releaseRoot}/${path}`).join("\n") + "\n";
  const result = spawnSync("zip", ["-X", "-q", destination, "-@"], { cwd: staging, input: entries, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`zip failed: ${result.stderr}`);
  await rm(staging, { recursive: true, force: true });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
