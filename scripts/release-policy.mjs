import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const SOURCE_REQUIRED_GATES = [
  "G0_TEMPLATE_CONTRACT",
  "G0_DOCUMENTATION",
  "G0_REPOSITORY_POLICY",
  "G0_SHELL_BASELINE",
  "G1_LOCAL_QUALITY",
  "G1_GOLDEN_FIXTURE",
  "G2_API_CONTRACT",
  "G2_API_CLI",
  "G2_WEB_BUNDLE",
  "G3_PERFORMANCE",
  "G5_DEPENDENCY_AUDIT",
  "G5_LICENSE_POLICY",
  "G5_SECRET_SCAN",
  "G5_OBSERVABILITY_LOCAL",
  "G5_SBOM_SOURCE",
  "G6_GRACEFUL_SHUTDOWN_LOCAL",
  "G6_PRODUCTION_LAYOUT_LOCAL",
  "G7_RELEASE_METADATA"
];

export const PRODUCTION_REQUIRED_GATES = [
  ...SOURCE_REQUIRED_GATES,
  "G2_BROWSER_ACCESSIBILITY",
  "G3_LOAD_SOAK",
  "G4_DATABASE",
  "G5_SECURITY",
  "G5_AUTH_TENANT",
  "G5_SBOM_IMAGE_SIGNING",
  "G6_DEPLOYMENT",
  "G6_CONTAINER_RUNTIME",
  "G6_HA_RECOVERY",
  "G6_CROSS_PLATFORM"
];

export async function evaluateReleasePolicy(root = process.cwd()) {
  const [packageJson, template, state, changelog] = await Promise.all([
    json(root, "package.json"),
    json(root, "template.json"),
    json(root, ".codex/project-state.json"),
    readFile(resolve(root, "CHANGELOG.md"), "utf8")
  ]);
  const failures = [];
  if (!changelog.includes("## [Unreleased]")) failures.push("CHANGELOG.md must contain an Unreleased section");
  if (!changelog.includes(`## [${packageJson.version}]`)) {
    failures.push(`CHANGELOG.md must contain the project release ${packageJson.version}`);
  }
  if (!changelog.includes(`\`${template.templateVersion}\``)) {
    failures.push(`CHANGELOG.md must mention template version ${template.templateVersion}`);
  }

  const sourceUnresolved = unresolved(state.gates, SOURCE_REQUIRED_GATES);
  const productionUnresolved = unresolved(state.gates, PRODUCTION_REQUIRED_GATES);
  if (sourceUnresolved.length > 0) {
    failures.push(`source release gates are unresolved: ${sourceUnresolved.map(formatGate).join(", ")}`);
  }
  if (state.gates.G7_PRODUCTION_RELEASE === "PASS" && productionUnresolved.length > 0) {
    failures.push("G7_PRODUCTION_RELEASE cannot be PASS while production-required gates are unresolved");
  }

  const classification =
    sourceUnresolved.length > 0
      ? "SOURCE_TEMPLATE_BLOCKED"
      : productionUnresolved.length === 0
        ? state.gates.G7_PRODUCTION_RELEASE === "PASS"
          ? "PRODUCTION_READY"
          : "RELEASE_CANDIDATE"
        : "SOURCE_TEMPLATE_READY";

  return {
    projectVersion: packageJson.version,
    templateVersion: template.templateVersion,
    classification,
    sourceUnresolved,
    productionUnresolved,
    blockers: state.blockers ?? [],
    gateSummary: state.gates,
    failures
  };
}

function unresolved(gates, required) {
  return required.filter((gate) => gates[gate] !== "PASS").map((gate) => ({ gate, status: gates[gate] ?? "MISSING" }));
}

function formatGate({ gate, status }) {
  return `${gate}=${status}`;
}

async function json(root, path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await evaluateReleasePolicy();
  if (result.failures.length > 0) {
    console.error(JSON.stringify({ status: "failed", ...result }, null, 2));
    process.exitCode = 1;
  } else console.log(JSON.stringify({ status: "passed", ...result }, null, 2));
}
