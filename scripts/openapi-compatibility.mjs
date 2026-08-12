export function compareOpenApi(baseline, current) {
  const failures = [];
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
      compareRequest(failures, path, method, pathItem[method], next);
      compareSecurity(failures, path, method, pathItem[method], next);
      compareResponses(failures, path, method, pathItem[method], next);
    }
  }
  return failures;
}

function compareSecurity(failures, path, method, before, after) {
  if (!requiresAuthentication(before.security) && requiresAuthentication(after.security)) {
    failures.push(`${method.toUpperCase()} ${path}: authentication became required`);
  }
}

function requiresAuthentication(security) {
  return (
    Array.isArray(security) &&
    security.length > 0 &&
    !security.some((requirement) => Object.keys(requirement).length === 0)
  );
}

function compareRequest(failures, path, method, before, after) {
  if (!before.requestBody?.required && after.requestBody?.required) {
    failures.push(`${method.toUpperCase()} ${path}: request body became required`);
  }
  const oldSchema = before.requestBody?.content?.["application/json"]?.schema;
  const newSchema = after.requestBody?.content?.["application/json"]?.schema;
  if (oldSchema && !newSchema) failures.push(`${method.toUpperCase()} ${path}: removed JSON request schema`);
  else if (oldSchema && newSchema) {
    compareSchema(failures, oldSchema, newSchema, `${method.toUpperCase()} ${path} request`, "request");
  }
}

function compareResponses(failures, path, method, before, after) {
  for (const [status, response] of Object.entries(before.responses ?? {})) {
    const next = after.responses?.[status];
    if (!next) {
      failures.push(`${method.toUpperCase()} ${path}: removed response ${status}`);
      continue;
    }
    const oldSchema = response.content?.["application/json"]?.schema;
    const newSchema = next.content?.["application/json"]?.schema;
    if (oldSchema && !newSchema) {
      failures.push(`${method.toUpperCase()} ${path}: removed JSON response schema ${status}`);
    } else if (oldSchema && newSchema) {
      compareSchema(failures, oldSchema, newSchema, `${method.toUpperCase()} ${path} response ${status}`, "response");
    }
  }
}

function compareSchema(failures, before, after, at, mode) {
  if (before.type && after.type !== before.type) failures.push(`${at}: type changed ${before.type} -> ${after.type}`);
  if (before.enum) {
    const incompatible =
      mode === "request"
        ? before.enum.some((value) => !after.enum?.includes(value))
        : (after.enum ?? []).some((value) => !before.enum.includes(value));
    if (incompatible) failures.push(`${at}: enum ${mode === "request" ? "value removed" : "value added"}`);
  }
  if (mode === "request") {
    const addedRequired = (after.required ?? []).filter((key) => !(before.required ?? []).includes(key));
    if (addedRequired.length) failures.push(`${at}: new required fields ${addedRequired.join(",")}`);
  } else {
    const removedRequired = (before.required ?? []).filter((key) => !(after.required ?? []).includes(key));
    if (removedRequired.length) failures.push(`${at}: required response fields removed ${removedRequired.join(",")}`);
  }
  for (const [name, schema] of Object.entries(before.properties ?? {})) {
    if (!after.properties?.[name]) failures.push(`${at}: property removed ${name}`);
    else compareSchema(failures, schema, after.properties[name], `${at}.${name}`, mode);
  }
  if (before.items && after.items) compareSchema(failures, before.items, after.items, `${at}[]`, mode);
  for (const keyword of ["anyOf", "oneOf"]) {
    const oldBranches = before[keyword];
    if (!Array.isArray(oldBranches)) continue;
    const newBranches = after[keyword];
    if (!Array.isArray(newBranches)) {
      failures.push(`${at}: ${keyword} removed`);
      continue;
    }
    const incompatible =
      mode === "request"
        ? oldBranches.some((branch) => !newBranches.some((candidate) => schemaContains(candidate, branch)))
        : newBranches.some((branch) => !oldBranches.some((candidate) => schemaContains(candidate, branch)));
    if (incompatible) failures.push(`${at}: ${keyword} ${mode === "request" ? "branch removed" : "branch added"}`);
  }
  for (const keyword of ["pattern", "format"]) {
    if (before[keyword] !== undefined && after[keyword] !== before[keyword]) {
      failures.push(`${at}: ${keyword} changed`);
    } else if (mode === "request" && before[keyword] === undefined && after[keyword] !== undefined) {
      failures.push(`${at}: ${keyword} narrowed`);
    }
  }
  if (before.additionalProperties === true && after.additionalProperties === false && mode === "request") {
    failures.push(`${at}: additionalProperties narrowed`);
  }
  if (mode === "request") {
    for (const key of ["minimum", "minItems", "minLength"]) {
      if (after[key] !== undefined && (before[key] === undefined || after[key] > before[key])) {
        failures.push(`${at}: ${key} narrowed`);
      }
    }
    for (const key of ["maximum", "maxItems", "maxLength"]) {
      if (after[key] !== undefined && (before[key] === undefined || after[key] < before[key])) {
        failures.push(`${at}: ${key} narrowed`);
      }
    }
  }
}

function schemaContains(candidate, expected) {
  if (expected === true) return candidate === true;
  if (expected === false) return candidate === false;
  if (typeof expected !== "object" || expected === null || typeof candidate !== "object" || candidate === null) {
    return Object.is(candidate, expected);
  }
  return Object.entries(expected).every(([key, value]) => {
    if (key === "description" || key === "title") return true;
    if (Array.isArray(value)) {
      return (
        Array.isArray(candidate[key]) &&
        value.every((item) => candidate[key].some((next) => schemaContains(next, item)))
      );
    }
    return schemaContains(candidate[key], value);
  });
}
