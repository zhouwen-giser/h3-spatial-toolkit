import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const scripts = ["scripts/run-acceptance.sh", "scripts/verify-database.sh"];
const failures = [];
const bash = resolveBash();

for (const path of scripts) {
  const syntax = spawnSync(bash.command, [...bash.args, "-n", path], { encoding: "utf8" });
  if (syntax.status !== 0) failures.push(`${path}: bash -n failed: ${(syntax.stderr || syntax.stdout).trim()}`);
  const source = await readFile(path, "utf8");
  if (!source.startsWith("#!/usr/bin/env bash\n")) failures.push(`${path}: must use the portable bash env shebang`);
  if (!/^set -euo pipefail$/m.test(source)) failures.push(`${path}: must enable errexit, nounset and pipefail`);
  if (/\beval\b|`[^`]+`|\b(?:curl|wget)\b[^\n|]*\|\s*(?:ba)?sh\b/.test(source)) {
    failures.push(`${path}: contains a forbidden dynamic execution construct`);
  }
  if (/chmod\s+(?:-R\s+)?777\b/.test(source)) failures.push(`${path}: world-writable chmod is forbidden`);
  if (process.platform !== "win32") {
    try {
      await access(path, constants.X_OK);
    } catch {
      failures.push(`${path}: worktree file must be executable`);
    }
  }
}

const shellcheck = runShellcheck();
if (shellcheck.status !== 0) {
  const diagnostic = shellcheck.stderr || shellcheck.stdout || shellcheck.error?.message || "unknown failure";
  failures.push(`shellcheck failed: ${diagnostic.trim()}`);
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
        shellcheck: "PASS",
        shellcheckRuntime: shellcheck.runtime,
        shellcheckImage: shellcheck.image
      },
      null,
      2
    )
  );
}

function resolveBash() {
  const candidates =
    process.platform === "win32"
      ? [
          { command: "C:\\Program Files\\Git\\bin\\bash.exe", args: [] },
          { command: "C:\\Program Files\\Git\\usr\\bin\\bash.exe", args: [] },
          { command: "bash", args: [] }
        ]
      : [{ command: "bash", args: [] }];
  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, ["--version"], { encoding: "utf8" });
    if (!result.error && result.status === 0) return candidate;
  }
  failures.push("bash is required but no executable runtime was found");
  return candidates.at(-1) ?? { command: "bash", args: [] };
}

function runShellcheck() {
  const expectedVersion = "0.11.0";
  const native = spawnSync("shellcheck", ["--version"], { encoding: "utf8" });
  if (!native.error && native.status === 0) {
    const actualVersion = native.stdout.match(/^version:\s*(\S+)$/m)?.[1];
    if (actualVersion === expectedVersion) {
      return {
        ...spawnSync("shellcheck", ["--severity=warning", ...scripts], { encoding: "utf8" }),
        runtime: "native",
        version: actualVersion
      };
    }
  }
  const image = "koalaman/shellcheck:v0.11.0@sha256:61862eba1fcf09a484ebcc6feea46f1782532571a34ed51fedf90dd25f925a8d";
  const docker = spawnSync(
    "docker",
    ["run", "--rm", "-v", `${process.cwd()}:/mnt:ro`, image, "--severity=warning", ...scripts],
    { encoding: "utf8" }
  );
  return { ...docker, runtime: "docker", image, version: expectedVersion };
}
