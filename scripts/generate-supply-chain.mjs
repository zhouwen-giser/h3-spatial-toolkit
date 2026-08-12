import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectProductionPackages, isExternalPackage, packageIdentity } from "./production-packages.mjs";

const root = resolve(process.cwd());
const [rootPackage, template, packages] = await Promise.all([
  json("package.json"),
  json("template.json"),
  collectProductionPackages(root)
]);
const packageByPath = new Map(packages.map((item) => [item.path, item]));
const rootIdentity = `${rootPackage.name}@${rootPackage.version}`;
const rootRef = purl(rootPackage.name, rootPackage.version);

const unique = new Map();
for (const item of packages) {
  const identity = packageIdentity(item);
  if (identity === rootIdentity && item.path === root) continue;
  const current = unique.get(identity) ?? { representative: item, dependencyIdentities: new Set() };
  for (const path of item.dependencyPaths) {
    const dependency = packageByPath.get(path);
    if (dependency) current.dependencyIdentities.add(packageIdentity(dependency));
  }
  unique.set(identity, current);
}

const components = [...unique.values()]
  .map(({ representative }) => component(representative))
  .sort((left, right) => left["bom-ref"].localeCompare(right["bom-ref"]));
const validRefs = new Set([rootRef, ...components.map((item) => item["bom-ref"])]);
const dependencies = [
  {
    ref: rootRef,
    dependsOn: components
      .filter((item) => item.properties.some((property) => property.name === "h3-toolkit:workspace"))
      .map((item) => item["bom-ref"])
      .sort()
  },
  ...[...unique.entries()].map(([_identity, item]) => ({
    ref: purl(item.representative.packageJson.name, item.representative.packageJson.version),
    dependsOn: [...item.dependencyIdentities]
      .filter((dependencyIdentity) => dependencyIdentity !== rootIdentity)
      .map((dependencyIdentity) => {
        const at = dependencyIdentity.lastIndexOf("@");
        return purl(dependencyIdentity.slice(0, at), dependencyIdentity.slice(at + 1));
      })
      .filter((ref) => validRefs.has(ref))
      .sort()
  }))
].sort((left, right) => left.ref.localeCompare(right.ref));

const fingerprint = createHash("sha256")
  .update(JSON.stringify(components.map((item) => item["bom-ref"])))
  .digest("hex");
const bom = {
  $schema: "https://cyclonedx.org/schema/bom-1.6.schema.json",
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${uuidFromHash(fingerprint)}`,
  version: 1,
  metadata: {
    timestamp: new Date(Number(template.releaseEpoch) * 1000).toISOString(),
    tools: { components: [{ type: "application", name: "h3-toolkit-supply-chain-generator", version: "1" }] },
    component: {
      type: "application",
      "bom-ref": rootRef,
      group: "",
      name: rootPackage.name,
      version: rootPackage.version,
      purl: rootRef,
      licenses: [{ expression: rootPackage.license }]
    }
  },
  components,
  dependencies
};

const external = [...unique.values()]
  .map((item) => item.representative)
  .filter(isExternalPackage)
  .sort((left, right) => packageIdentity(left).localeCompare(packageIdentity(right)));
const notice = [
  "# Third-Party Production Dependencies",
  "",
  `Generated deterministically for ${rootIdentity}. This inventory does not replace the license text shipped by each dependency.`,
  "",
  "| Package | License |",
  "|---|---|",
  ...external.map((item) => `| \`${packageIdentity(item)}\` | ${licenseOf(item.packageJson)} |`),
  ""
].join("\n");

const outputs = [
  { path: resolve(root, "sbom/cyclonedx-bom.json"), content: `${JSON.stringify(bom, null, 2)}\n` },
  { path: resolve(root, "THIRD_PARTY_NOTICES.md"), content: notice }
];
const mode = process.argv[2] ?? "--check";
if (mode === "--write") {
  for (const output of outputs) {
    await mkdir(resolve(output.path, ".."), { recursive: true });
    await writeFile(output.path, output.content);
  }
  console.log(JSON.stringify(summary("written"), null, 2));
} else if (mode === "--check") {
  const stale = [];
  for (const output of outputs) {
    if ((await readFile(output.path, "utf8").catch(() => "")) !== output.content) stale.push(output.path);
  }
  if (stale.length > 0) {
    console.error(`Supply-chain artifacts are missing or stale: ${stale.join(", ")}`);
    process.exitCode = 1;
  } else console.log(JSON.stringify(summary("passed"), null, 2));
} else throw new Error("Usage: generate-supply-chain.mjs [--check|--write]");

function component(item) {
  const pkg = item.packageJson;
  const ref = purl(pkg.name, pkg.version);
  return {
    type: pkg.private && pkg.name.startsWith("@h3-toolkit/") ? "application" : "library",
    "bom-ref": ref,
    group: pkg.name.startsWith("@") ? pkg.name.slice(1).split("/")[0] : "",
    name: pkg.name.startsWith("@") ? pkg.name.split("/")[1] : pkg.name,
    version: pkg.version,
    purl: ref,
    licenses: [{ expression: licenseOf(pkg) }],
    properties: [{ name: "h3-toolkit:workspace", value: String(!isExternalPackage(item)) }]
  };
}

function purl(name, version) {
  if (name.startsWith("@")) {
    const [scope, packageName] = name.split("/");
    return `pkg:npm/${encodeURIComponent(scope)}/${encodeURIComponent(packageName)}@${version}`;
  }
  return `pkg:npm/${encodeURIComponent(name)}@${version}`;
}

function licenseOf(pkg) {
  return typeof pkg.license === "string" ? pkg.license : (pkg.license?.type ?? "NOASSERTION");
}

function uuidFromHash(hash) {
  const characters = hash.slice(0, 32).split("");
  characters[12] = "5";
  characters[16] = "8";
  const value = characters.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function summary(status) {
  return {
    status,
    format: "CycloneDX 1.6 JSON",
    components: components.length,
    externalProductionPackages: external.length,
    unresolvedLicenses: external.filter((item) => licenseOf(item.packageJson) === "NOASSERTION").length,
    artifacts: ["sbom/cyclonedx-bom.json", "THIRD_PARTY_NOTICES.md"]
  };
}

async function json(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
