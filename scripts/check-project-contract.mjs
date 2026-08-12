import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const failures = [];

const requiredFiles = [
  "AGENTS.md",
  "CODEX_START_HERE.md",
  "PROJECT_STATUS.md",
  "template.json",
  ".codex/project-state.json",
  "docs/17_SYSTEM_DETAILED_DESIGN.md",
  "docs/18_DEVELOPMENT_PLAN.md",
  "docs/19_ACCEPTANCE_GATES.md",
  "docs/20_REQUIREMENTS_TRACEABILITY.md",
  "docs/21_TRUSTED_ACCESS_POLICY.md",
  "docs/22_TEMPLATE_ACCEPTANCE_REPORT.md",
  "docs/23_ENGINEERING_GOVERNANCE.md",
  "docs/24_TEST_STRATEGY.md",
  "docs/25_RELEASE_AND_DELIVERY.md",
  "docs/26_OPERATIONS_RUNBOOK.md",
  "docs/27_SECURITY_PRIVACY_COMPLIANCE.md",
  "docs/28_ENVIRONMENT_EXECUTION_MATRIX.md",
  "docs/29_UNFINISHED_WORK_REGISTER.md",
  "contracts/COMPATIBILITY_POLICY.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "THIRD_PARTY_NOTICES.md",
  "sbom/cyclonedx-bom.json",
  "database/fixtures/h3-cross-engine-golden.json",
  "templates/WORK_TASK_TEMPLATE.md",
  "templates/ADR_TEMPLATE.md",
  "templates/ACCEPTANCE_REPORT_TEMPLATE.md"
];

const packages = ["core", "geometry", "neighborhood", "aggregation", "coverage", "flow", "io", "postgis"];
const apps = ["api", "cli", "web-demo"];

for (const path of requiredFiles) await requirePath(path);
for (const name of packages) await requirePath(`packages/${name}/package.json`);
for (const name of apps) await requirePath(`apps/${name}/package.json`);

for (const path of [
  "package.json",
  "template.json",
  ".codex/project-state.json",
  ...packages.map((name) => `packages/${name}/package.json`),
  ...apps.map((name) => `apps/${name}/package.json`)
]) {
  try {
    JSON.parse(await read(path));
  } catch (error) {
    failures.push(`${path}: invalid JSON (${message(error)})`);
  }
}

const packageJson = JSON.parse(await read("package.json"));
for (const script of [
  "check:contract",
  "check:docs",
  "check:repository",
  "check:contracts",
  "check:golden",
  "check:licenses",
  "check:supply-chain",
  "check:shell",
  "check:release",
  "acceptance:local",
  "acceptance:api",
  "acceptance:database",
  "acceptance:full",
  "benchmark"
]) {
  if (!packageJson.scripts?.[script]) failures.push(`package.json: missing script ${script}`);
}

const design = await read("docs/17_SYSTEM_DETAILED_DESIGN.md");
const traceability = await read("docs/20_REQUIREMENTS_TRACEABILITY.md");
for (let number = 1; number <= 12; number += 1) {
  const id = `FR-${String(number).padStart(3, "0")}`;
  if (!design.includes(id)) failures.push(`system design: missing ${id}`);
  if (!traceability.includes(id)) failures.push(`traceability: missing ${id}`);
}

const migration = await read("database/migrations/002_schema.sql");
const aggregate = await read("database/sql/aggregate.sql");
if (!/PRIMARY KEY\s*\(cell, metric, bucket, bucket_start\)/i.test(migration))
  failures.push("database migration: h3_metric primary key mismatch");
if (!/ON CONFLICT\s*\(cell, metric, bucket, bucket_start\)/i.test(aggregate))
  failures.push("aggregate SQL: conflict target mismatch");
if (!/GROUP BY\s+1,\s*5/i.test(aggregate)) failures.push("aggregate SQL: must group by cell and bucket_start");

const currentTasks = (await readdir(resolve(root, "tasks/current"))).filter((name) => name.endsWith(".md"));
if (currentTasks.length !== 1)
  failures.push(`tasks/current: expected exactly 1 active task, found ${currentTasks.length}`);

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: "passed",
        templateVersion: JSON.parse(await read("template.json")).templateVersion,
        requirements: 12,
        packages: packages.length,
        apps: apps.length,
        activeTask: currentTasks[0]
      },
      null,
      2
    )
  );
}

async function requirePath(path) {
  try {
    await access(resolve(root, path));
  } catch {
    failures.push(`missing: ${path}`);
  }
}

async function read(path) {
  return readFile(resolve(root, path), "utf8");
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}
