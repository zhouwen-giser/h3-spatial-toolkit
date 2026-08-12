import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const targets = ["coverage", "release"];

for (const target of targets) await rm(resolve(root, target), { recursive: true, force: true });

for (const group of ["packages", "apps"]) {
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(resolve(root, group), { withFileTypes: true })) {
    if (entry.isDirectory()) await rm(resolve(root, group, entry.name, "dist"), { recursive: true, force: true });
  }
}

console.log(JSON.stringify({ status: "passed", removed: ["coverage", "release", "packages/*/dist", "apps/*/dist"] }));
