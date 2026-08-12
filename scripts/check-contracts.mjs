import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

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
for (const [path, pathItem] of Object.entries(baseline.paths ?? {})) {
  if (!current.paths?.[path]) {
    failures.push(`OpenAPI breaking change: removed path ${path}`);
    continue;
  }
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    if (!pathItem[method]) continue;
    const next = current.paths[path][method];
    if (!next) {
      failures.push(`OpenAPI breaking change: removed ${method.toUpperCase()} ${path}`);
      continue;
    }
    compareRequest(path, method, pathItem[method], next);
    compareResponses(path, method, pathItem[method], next);
  }
}

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

function compareRequest(path, method, before, after) {
  if (before.requestBody?.required && !after.requestBody?.required)
    failures.push(`${method.toUpperCase()} ${path}: request body no longer required`);
  const oldSchema = before.requestBody?.content?.["application/json"]?.schema;
  const newSchema = after.requestBody?.content?.["application/json"]?.schema;
  if (oldSchema && !newSchema) failures.push(`${method.toUpperCase()} ${path}: removed JSON request schema`);
  else if (oldSchema && newSchema)
    compareSchema(oldSchema, newSchema, `${method.toUpperCase()} ${path} request`, "request");
}
function compareResponses(path, method, before, after) {
  for (const [status, response] of Object.entries(before.responses ?? {})) {
    const next = after.responses?.[status];
    if (!next) {
      failures.push(`${method.toUpperCase()} ${path}: removed response ${status}`);
      continue;
    }
    const oldSchema = response.content?.["application/json"]?.schema;
    const newSchema = next.content?.["application/json"]?.schema;
    if (oldSchema && !newSchema)
      failures.push(`${method.toUpperCase()} ${path}: removed JSON response schema ${status}`);
    else if (oldSchema && newSchema)
      compareSchema(oldSchema, newSchema, `${method.toUpperCase()} ${path} response ${status}`, "response");
  }
}
function compareSchema(before, after, at, mode) {
  if (before.type && after.type !== before.type) failures.push(`${at}: type changed ${before.type} -> ${after.type}`);
  if (before.enum && !before.enum.every((value) => after.enum?.includes(value)))
    failures.push(`${at}: enum value removed`);
  if (mode === "request") {
    const addedRequired = (after.required ?? []).filter((key) => !(before.required ?? []).includes(key));
    if (addedRequired.length) failures.push(`${at}: new required fields ${addedRequired.join(",")}`);
  } else {
    const removedRequired = (before.required ?? []).filter((key) => !(after.required ?? []).includes(key));
    if (removedRequired.length) failures.push(`${at}: required response fields removed ${removedRequired.join(",")}`);
  }
  for (const [name, schema] of Object.entries(before.properties ?? {})) {
    if (!after.properties?.[name]) failures.push(`${at}: property removed ${name}`);
    else compareSchema(schema, after.properties[name], `${at}.${name}`, mode);
  }
  if (before.items && after.items) compareSchema(before.items, after.items, `${at}[]`, mode);
  for (const key of ["minimum", "minItems", "minLength"])
    if (mode === "request" && before[key] !== undefined && after[key] > before[key])
      failures.push(`${at}: ${key} narrowed`);
  for (const key of ["maximum", "maxItems", "maxLength"])
    if (mode === "request" && before[key] !== undefined && after[key] < before[key])
      failures.push(`${at}: ${key} narrowed`);
}
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
