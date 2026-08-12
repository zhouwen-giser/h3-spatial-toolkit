import { lstat, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, extname, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const ignored = new Set([
  "node_modules",
  ".pnpm-store",
  ".git",
  "dist",
  "coverage",
  "output",
  "release",
  "MANIFEST.json"
]);
const files = await collect(root);
const failures = [];
const allowedStatuses = new Set(["PASS", "PARTIAL", "NOT_RUN", "BLOCKED"]);
const allowedWorkItemStatuses = new Set([
  "PLANNED",
  "READY",
  "IN_PROGRESS",
  "REVIEW",
  "COMPLETE_LOCAL",
  "COMPLETE",
  "DEFERRED",
  "BLOCKED"
]);

for (const path of files.filter((path) => extname(path) === ".json")) {
  try {
    JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    failures.push(`${rel(path)}: invalid JSON (${message(error)})`);
  }
}

for (const path of files) {
  const name = basename(path);
  const relativePath = rel(path);
  if (/^\.env(?:\.|$)/.test(name) && name !== ".env.example")
    failures.push(`${relativePath}: real environment file is forbidden`);
  if (/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(name)) failures.push(`${relativePath}: key material is forbidden`);
  const stats = await lstat(path);
  if (stats.size > 2_000_000 || /\.(?:png|jpg|jpeg|gif|zip|ico)$/i.test(name)) continue;
  const content = await readFile(path, "utf8").catch(() => "");
  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,
    /\bAIza[0-9A-Za-z_-]{30,}\b/
  ];
  if (secretPatterns.some((pattern) => pattern.test(content)))
    failures.push(`${relativePath}: possible credential or private key`);
  if (
    relativePath !== "scripts/check-repository-policy.mjs" &&
    /\b(?:TODO|FIXME|HACK)\b/.test(content) &&
    !relativePath.startsWith("tasks/") &&
    !relativePath.startsWith("docs/")
  ) {
    failures.push(`${relativePath}: TODO/FIXME/HACK must be represented as a Work Item`);
  }
}

const rootPackage = await json("package.json");
const template = await json("template.json");
const state = await json(".codex/project-state.json");
if (template.templateVersion !== state.templateVersion)
  failures.push("template.json and project-state templateVersion mismatch");
if (template.projectVersion !== rootPackage.version || state.baselineVersion !== rootPackage.version)
  failures.push("project version mismatch");

const packageFiles = files.filter((path) => basename(path) === "package.json");
for (const path of packageFiles) {
  const pkg = JSON.parse(await readFile(path, "utf8"));
  if (pkg.version && pkg.version !== rootPackage.version)
    failures.push(`${rel(path)}: version must match root ${rootPackage.version}`);
  for (const group of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, version] of Object.entries(pkg[group] ?? {})) {
      if (String(version).startsWith("workspace:")) continue;
      if (/^(?:\^|~|>|<|\*|latest$)/.test(String(version)))
        failures.push(`${rel(path)}: ${group}.${name} must be exactly pinned`);
    }
  }
}

for (const [gate, status] of Object.entries(state.gates ?? {})) {
  if (!allowedStatuses.has(status)) failures.push(`project-state: invalid gate status ${gate}=${status}`);
  if (status === "PASS") {
    const evidence = resolve(root, "evidence/gates", `${gate}.json`);
    try {
      const record = JSON.parse(await readFile(evidence, "utf8"));
      if (
        record.status !== "PASS" ||
        record.gate !== gate ||
        !Array.isArray(record.commands) ||
        record.commands.length === 0
      ) {
        failures.push(`evidence/gates/${gate}.json: incomplete PASS evidence`);
      }
    } catch {
      failures.push(`project-state: PASS gate ${gate} has no evidence record`);
    }
  }
}
if (!allowedWorkItemStatuses.has(state.activeWorkItemStatus)) {
  failures.push(`project-state: invalid active work item status ${state.activeWorkItemStatus}`);
}

const activeTask = String(state.activeWorkItem ?? "");
const currentTasks = files.filter((path) => rel(path).startsWith("tasks/current/") && path.endsWith(".md"));
if (currentTasks.length !== 1) failures.push(`tasks/current: expected exactly one task, found ${currentTasks.length}`);
if (currentTasks.length === 1 && !(await readFile(currentTasks[0], "utf8")).includes(activeTask))
  failures.push("activeWorkItem does not match tasks/current");

for (const path of files.filter(
  (path) => rel(path).startsWith("tasks/") && path.endsWith(".md") && basename(path) !== "README.md"
)) {
  const content = await readFile(path, "utf8");
  for (const heading of ["## 目标", "## 依赖", "## 验收"])
    if (!content.includes(heading)) failures.push(`${rel(path)}: missing ${heading}`);
}

const shellScripts = ["scripts/run-acceptance.sh", "scripts/verify-database.sh"];
const trackedModes = gitModes(shellScripts);
for (const path of shellScripts) {
  if (trackedModes.get(path) !== "100755") failures.push(`${path}: Git mode must be 100755`);
  if (process.platform !== "win32") {
    const mode = (await lstat(resolve(root, path))).mode;
    if ((mode & 0o111) === 0) failures.push(`${path}: worktree file must be executable`);
  }
}

for (const forbidden of [".DS_Store", "Thumbs.db"])
  if (files.some((path) => basename(path) === forbidden)) failures.push(`${forbidden}: forbidden repository artifact`);

finish(
  {
    filesChecked: files.length,
    packageFiles: packageFiles.length,
    passEvidence: Object.values(state.gates).filter((x) => x === "PASS").length
  },
  failures
);

async function collect(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await collect(path)));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
async function json(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
function rel(path) {
  return relative(root, path).replaceAll("\\", "/");
}
function message(error) {
  return error instanceof Error ? error.message : String(error);
}
function gitModes(paths) {
  const result = spawnSync("git", ["ls-files", "--stage", "--", ...paths], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    failures.push(`git ls-files --stage failed (${message(result.error ?? result.stderr)})`);
    return new Map();
  }
  return new Map(
    result.stdout
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [metadata, path] = line.split("\t", 2);
        return [path.replaceAll("\\", "/"), metadata.split(" ", 1)[0]];
      })
  );
}
function finish(summary, errors) {
  if (errors.length) {
    console.error(JSON.stringify({ status: "failed", failures: errors }, null, 2));
    process.exitCode = 1;
  } else console.log(JSON.stringify({ status: "passed", ...summary }, null, 2));
}
