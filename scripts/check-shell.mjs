import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const scripts = ["scripts/run-acceptance.sh", "scripts/verify-database.sh"];
const failures = [];
for (const path of scripts) {
  const syntax = spawnSync("bash", ["-n", path], { encoding: "utf8" });
  if (syntax.status !== 0) failures.push(`${path}: bash -n failed: ${(syntax.stderr || syntax.stdout).trim()}`);
  const source = await readFile(path, "utf8");
  if (!source.startsWith("#!/usr/bin/env bash\n")) failures.push(`${path}: must use the portable bash env shebang`);
  if (!/^set -euo pipefail$/m.test(source)) failures.push(`${path}: must enable errexit, nounset and pipefail`);
  if (/\beval\b|`[^`]+`|\b(?:curl|wget)\b[^\n|]*\|\s*(?:ba)?sh\b/.test(source)) {
    failures.push(`${path}: contains a forbidden dynamic execution construct`);
  }
  if (/chmod\s+(?:-R\s+)?777\b/.test(source)) failures.push(`${path}: world-writable chmod is forbidden`);
  try {
    await access(path, constants.X_OK);
  } catch {
    failures.push(`${path}: must be executable`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: "passed",
        scripts: scripts.length,
        bashSyntax: true,
        strictMode: true,
        unsafeConstructs: 0,
        shellcheck: "NOT_RUN"
      },
      null,
      2
    )
  );
}
