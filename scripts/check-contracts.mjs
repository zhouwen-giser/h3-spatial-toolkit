import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { compareOpenApi } from "./openapi-compatibility.mjs";

const root = resolve(process.cwd());
const failures = [];
const openapiPath = resolve(root, "apps/api/openapi.json");
const baselinePath = resolve(root, "contracts/openapi.v1.baseline.json");
const current = await parse(openapiPath);
const baseline = await parse(baselinePath);

try {
  await SwaggerParser.validate(openapiPath);
} catch (error) {
  failures.push(`OpenAPI validation failed: ${message(error)}`);
}
try {
  await SwaggerParser.validate(baselinePath);
} catch (error) {
  failures.push(`OpenAPI baseline validation failed: ${message(error)}`);
}

if (current.info?.version !== (await parse(resolve(root, "package.json"))).version)
  failures.push("OpenAPI version differs from package version");
failures.push(...compareOpenApi(baseline, current));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaDir = resolve(root, "packages/io/schema");
const schemaFiles = (await readdir(schemaDir)).filter((name) => name.endsWith(".schema.json")).sort();
const ids = new Set();
const examples = {
  "h3-cell.schema.json": {
    valid: { index: "892f5a32d97ffff", resolution: 9 },
    invalid: { index: "bad", resolution: 16 }
  },
  "h3-metric.schema.json": {
    valid: { cell: "892f5a32d97ffff", resolution: 9, metric: "count", value: 3 },
    invalid: { cell: "bad", resolution: 9, metric: "", value: 3 }
  },
  "h3-time-metric.schema.json": {
    valid: {
      cell: "892f5a32d97ffff",
      resolution: 9,
      metric: "count",
      value: 3,
      timestamp: "2026-08-12T00:00:00Z",
      bucket: "hour"
    },
    invalid: {
      cell: "892f5a32d97ffff",
      resolution: 9,
      metric: "count",
      value: 3,
      timestamp: "yesterday",
      bucket: "quarter"
    }
  },
  "h3-flow.schema.json": {
    valid: { origin: "892f5a32d97ffff", destination: "892f5a32d87ffff", count: 1 },
    invalid: { origin: "bad", destination: "892f5a32d87ffff", count: -1 }
  }
};

for (const name of schemaFiles) {
  const schema = await parse(resolve(schemaDir, name));
  if (!ajv.validateSchema(schema)) failures.push(`${name}: invalid JSON Schema ${ajv.errorsText(ajv.errors)}`);
  if (ids.has(schema.$id)) failures.push(`${name}: duplicate $id ${schema.$id}`);
  ids.add(schema.$id);
  const validate = ajv.compile(schema);
  if (!validate(examples[name]?.valid))
    failures.push(`${name}: valid fixture rejected ${ajv.errorsText(validate.errors)}`);
  if (validate(examples[name]?.invalid)) failures.push(`${name}: invalid fixture accepted`);
}

const ioSource = await readFile(resolve(root, "packages/io/src/index.ts"), "utf8");
for (const id of ids) if (!ioSource.includes(id)) failures.push(`packages/io/src/index.ts: missing schema id ${id}`);

finish(
  {
    openapiPaths: Object.keys(current.paths ?? {}).length,
    baselinePaths: Object.keys(baseline.paths ?? {}).length,
    schemas: schemaFiles.length
  },
  failures
);

async function parse(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
function message(error) {
  return error instanceof Error ? error.message : String(error);
}
function finish(summary, errors) {
  if (errors.length) {
    console.error(JSON.stringify({ status: "failed", failures: errors }, null, 2));
    process.exitCode = 1;
  } else console.log(JSON.stringify({ status: "passed", ...summary }, null, 2));
}
