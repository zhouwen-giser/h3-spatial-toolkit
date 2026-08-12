import { describe, expect, it } from "vitest";

import { compareOpenApi } from "../scripts/openapi-compatibility.mjs";

const operation = (requestBody: object) => ({ requestBody, responses: { 200: { description: "ok" } } });
const document = (requestBody: object) => ({ paths: { "/probe": { post: operation(requestBody) } } });
const body = (required: boolean, schema: object) => ({
  required,
  content: { "application/json": { schema } }
});
type TestDocument = {
  paths: {
    "/probe": {
      post: {
        requestBody: object;
        security?: Array<Record<string, string[]>>;
        responses: Record<
          number,
          { description: string; content?: { "application/json": { schema: { oneOf: Array<{ type: string }> } } } }
        >;
      };
    };
  };
};

describe("OpenAPI compatibility mutations", () => {
  it("rejects an optional request body becoming required but allows the reverse", () => {
    const schema = { type: "object", properties: {} };
    expect(compareOpenApi(document(body(false, schema)), document(body(true, schema)))).toContain(
      "POST /probe: request body became required"
    );
    expect(compareOpenApi(document(body(true, schema)), document(body(false, schema)))).toEqual([]);
  });

  it("rejects adding request bounds where the baseline had none", () => {
    const before = document(body(true, { type: "object", properties: { records: { type: "array" } } }));
    const after = document(body(true, { type: "object", properties: { records: { type: "array", maxItems: 100 } } }));
    expect(compareOpenApi(before, after)).toContain("POST /probe request.records: maxItems narrowed");
  });

  it("rejects newly required request fields and removed request enum values", () => {
    const before = document(
      body(true, {
        type: "object",
        properties: { mode: { type: "string", enum: ["a", "b"] } }
      })
    );
    const after = document(
      body(true, {
        type: "object",
        required: ["mode"],
        properties: { mode: { type: "string", enum: ["a"] } }
      })
    );
    expect(compareOpenApi(before, after)).toEqual(
      expect.arrayContaining([
        "POST /probe request: new required fields mode",
        "POST /probe request.mode: enum value removed"
      ])
    );
  });

  it("rejects an operation becoming authenticated by default", () => {
    const before = document(body(true, { type: "object", properties: {} }));
    const after = structuredClone(before) as TestDocument;
    after.paths["/probe"].post.security = [{ deploymentCredential: [] }];
    expect(compareOpenApi(before, after)).toContain("POST /probe: authentication became required");
  });

  it("rejects request union branches being removed and response union branches being added", () => {
    const before = document(body(true, { anyOf: [{ type: "integer" }, { type: "string" }] }));
    const narrowed = document(body(true, { anyOf: [{ type: "integer" }] }));
    expect(compareOpenApi(before, narrowed)).toContain("POST /probe request: anyOf branch removed");

    const responseBefore = structuredClone(before) as TestDocument;
    responseBefore.paths["/probe"].post.responses[200]!.content = {
      "application/json": { schema: { oneOf: [{ type: "string" }] } }
    };
    const responseAfter = structuredClone(responseBefore);
    responseAfter.paths["/probe"].post.responses[200]!.content!["application/json"].schema.oneOf.push({
      type: "number"
    });
    expect(compareOpenApi(responseBefore, responseAfter)).toContain("POST /probe response 200: oneOf branch added");
  });
});
