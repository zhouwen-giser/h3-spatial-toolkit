import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pnpmInvocation } from "./platform-command.mjs";

export async function collectProductionPackages(root = process.cwd()) {
  const invocation = pnpmInvocation(["list", "-r", "--prod", "--depth", "Infinity", "--json"]);
  const output = execFileSync(invocation.command, invocation.args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  const trees = JSON.parse(output);
  const nodesByPath = new Map();
  for (const tree of trees) visit(tree, nodesByPath);

  const packagesByPath = new Map();
  for (const [path, node] of nodesByPath) {
    const packageJson = JSON.parse(await readFile(resolve(path, "package.json"), "utf8"));
    packagesByPath.set(path, {
      path,
      packageJson,
      dependencyPaths: Object.values(node.dependencies ?? {})
        .map((dependency) => dependency.path)
        .filter((dependencyPath) => typeof dependencyPath === "string")
    });
  }

  return [...packagesByPath.values()].sort(comparePackage);
}

export function packageIdentity(item) {
  return `${item.packageJson.name}@${item.packageJson.version}`;
}

export function isExternalPackage(item) {
  return item.path.split(/[\\/]/).includes("node_modules");
}

function visit(node, nodesByPath) {
  if (typeof node.path === "string" && !nodesByPath.has(node.path)) nodesByPath.set(node.path, node);
  for (const dependency of Object.values(node.dependencies ?? {})) visit(dependency, nodesByPath);
}

function comparePackage(left, right) {
  return packageIdentity(left).localeCompare(packageIdentity(right)) || left.path.localeCompare(right.path);
}
