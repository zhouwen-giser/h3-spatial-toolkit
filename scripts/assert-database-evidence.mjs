import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function assertPlanEvidence(path, expectedIndex, expectedRelation) {
  const document = JSON.parse(await readFile(path, "utf8"));
  assert.ok(Array.isArray(document) && document.length === 1, `${path}: expected one EXPLAIN document`);
  const root = document[0]?.Plan;
  assert.ok(root && typeof root === "object", `${path}: missing root Plan`);

  const nodes = collectPlanNodes(root);
  const indexNodes = nodes.filter((node) => node["Index Name"] === expectedIndex);
  assert.ok(indexNodes.length > 0, `${path}: required index ${expectedIndex} was not used`);
  assert.ok(
    indexNodes.some((node) => Number(node["Actual Loops"]) > 0 && Number(node["Actual Rows"]) > 0),
    `${path}: required index ${expectedIndex} did not execute or return rows`
  );

  const sequentialScans = nodes.filter(
    (node) => /Seq Scan$/.test(String(node["Node Type"])) && node["Relation Name"] === expectedRelation
  );
  assert.deepEqual(
    sequentialScans.map((node) => node["Node Type"]),
    [],
    `${path}: ${expectedRelation} fell back to a sequential scan`
  );
  assert.ok(Number(root["Actual Loops"]) > 0 && Number(root["Actual Rows"]) > 0, `${path}: probe returned no rows`);
  assert.ok(
    nodes.some((node) => Object.hasOwn(node, "Shared Hit Blocks") || Object.hasOwn(node, "Shared Read Blocks")),
    `${path}: BUFFERS evidence is missing`
  );
  assert.ok(Number.isFinite(Number(document[0]["Execution Time"])), `${path}: ANALYZE execution timing is missing`);

  return {
    result: "index-plan-verified",
    plan: basename(path),
    relation: expectedRelation,
    requiredIndex: expectedIndex,
    rootNode: root["Node Type"],
    actualRows: root["Actual Rows"],
    executionTimeMs: document[0]["Execution Time"]
  };
}

export async function assertLogicalParity(sourcePath, restoredPath) {
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const restored = JSON.parse(await readFile(restoredPath, "utf8"));
  assert.equal(source.algorithm, "postgres-hashtextextended-seed-0-xor-and-sum-v1");
  for (const table of ["spatial_feature", "h3_metric"]) {
    assert.ok(Number(source[table]?.count) > 0, `${table}: source fingerprint must cover non-empty data`);
    for (const field of ["xor", "sum"]) {
      assert.equal(typeof source[table]?.[field], "string", `${table}.${field}: source checksum is missing`);
    }
  }
  assert.deepEqual(restored, source, "restored table counts or logical checksums differ from the source");
  return {
    result: "logical-restore-parity-verified",
    algorithm: source.algorithm,
    tables: {
      spatial_feature: source.spatial_feature,
      h3_metric: source.h3_metric
    }
  };
}

async function completeRun(runDirectory, latestPath, runId) {
  const required = [
    "environment.txt",
    "compose-services.jsonl",
    "compose-images.jsonl",
    "image-identity.txt",
    "extension-versions.txt",
    "migration.log",
    "smoke-test.log",
    "fixture-load.log",
    "certification-assertions.log",
    "integration-test.log",
    "extension-upgrade.log",
    "migration-rollback.log",
    "scale-100000.log",
    "scale-1000000.log",
    "scale-10000000.log",
    "source-logical-fingerprint.json",
    "restored-logical-fingerprint.json",
    "logical-parity.json",
    "backup-SHA256SUMS.txt",
    "backup-checksum-verification.log",
    "restore-rehearsal.log"
  ];
  for (const path of required) {
    const details = await stat(resolve(runDirectory, path));
    assert.ok(details.isFile() && details.size > 0, `${path}: required run evidence is empty or missing`);
  }
  for (const scale of ["10000", "100000", "1000000", "10000000"]) {
    for (const plan of ["h3", "gist", "time", "parent"]) {
      for (const suffix of ["plan.json", "assertion.json"]) {
        const path = resolve(runDirectory, "plans", scale, `${plan}-${suffix}`);
        const details = await stat(path);
        assert.ok(details.isFile() && details.size > 0, `${path}: required plan evidence is empty or missing`);
      }
    }
  }

  const completedAt = new Date().toISOString();
  const artifacts = (await collectFiles(runDirectory)).map((path) =>
    relative(runDirectory, path).replaceAll("\\", "/")
  );
  const summary = {
    runId,
    result: "certification-run-completed",
    completedAt,
    strictScaleRows: [100000, 1000000, 10000000],
    artifactCount: artifacts.length,
    artifacts
  };
  await writeFile(resolve(runDirectory, "run-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(
    latestPath,
    `${JSON.stringify(
      {
        runId,
        completedAt,
        relativeRunDirectory: relative(dirname(latestPath), runDirectory).replaceAll("\\", "/")
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return summary;
}

function collectPlanNodes(plan) {
  return [plan, ...(plan.Plans ?? []).flatMap(collectPlanNodes)];
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  let result;
  if (command === "plan" && args.length === 3) result = await assertPlanEvidence(...args);
  else if (command === "parity" && args.length === 2) result = await assertLogicalParity(...args);
  else if (command === "complete" && args.length === 3) result = await completeRun(...args);
  else {
    throw new Error(
      "Usage: assert-database-evidence.mjs plan <plan.json> <index> <relation> | parity <source.json> <restored.json> | complete <run-dir> <latest.json> <run-id>"
    );
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
