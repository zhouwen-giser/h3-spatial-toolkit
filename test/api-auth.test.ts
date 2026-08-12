import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../apps/api/src/app.js";
import {
  API_SCOPES,
  authenticate,
  resolveAuthentication,
  type Authenticator,
  type Principal
} from "../apps/api/src/auth.js";
import { loadServerConfig } from "../apps/api/src/config.js";

const indexPayload = {
  points: [{ longitude: 139.7671, latitude: 35.6812 }],
  resolution: 9
};

const principal = (scopes: readonly string[], tenantId = "tenant-a"): Principal => ({
  subject: "service-a",
  tenantId,
  scopes
});

describe("API authentication boundary", () => {
  it("preserves the unauthenticated local API by default", async () => {
    const app = await buildApp({ metricsEnabled: false });
    try {
      const response = await app.inject({ method: "POST", url: "/v1/h3/index", payload: indexPayload });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("keeps liveness and readiness public when authentication is required", async () => {
    const authenticator = vi.fn<Authenticator>(async () => principal([API_SCOPES.index]));
    const app = await buildApp({ authentication: { mode: "required", authenticator } });
    try {
      expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
      expect((await app.inject({ method: "GET", url: "/ready" })).statusCode).toBe(200);
      const metrics = await app.inject({ method: "GET", url: "/metrics" });
      assertAccessError(metrics, 401, "AUTHENTICATION_REQUIRED");
      expect(authenticator).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("returns stable 401 envelopes for missing and invalid credentials", async () => {
    const authenticator = vi.fn<Authenticator>(async () => null);
    const app = await buildApp({ authentication: { mode: "required", authenticator } });
    try {
      const missing = await app.inject({ method: "POST", url: "/v1/h3/index", payload: indexPayload });
      assertAccessError(missing, 401, "AUTHENTICATION_REQUIRED");
      expect(authenticator).not.toHaveBeenCalled();

      const invalid = await app.inject({
        method: "POST",
        url: "/v1/h3/index",
        headers: { authorization: "invalid" },
        payload: indexPayload
      });
      assertAccessError(invalid, 401, "AUTHENTICATION_FAILED");
      expect(authenticator).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it("returns 403 when the verified principal lacks the operation scope", async () => {
    const authenticator = vi.fn<Authenticator>(async () => principal([API_SCOPES.neighbors]));
    const app = await buildApp({ authentication: { mode: "required", authenticator } });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/h3/index",
        headers: { authorization: "valid-for-another-operation" },
        payload: indexPayload
      });
      assertAccessError(response, 403, "AUTHORIZATION_DENIED");
    } finally {
      await app.close();
    }
  });

  it("allows the fixed operation scope and passes only neutral request metadata to the authenticator", async () => {
    const authenticator = vi.fn<Authenticator>(async () => principal([API_SCOPES.index]));
    const app = await buildApp({ authentication: { mode: "required", authenticator } });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/h3/index",
        headers: { authorization: "deployment-token", "x-tenant-id": "tenant-b" },
        payload: indexPayload
      });
      expect(response.statusCode).toBe(200);
      expect(authenticator).toHaveBeenCalledOnce();
      expect(authenticator.mock.calls[0]?.[0]).toEqual({
        authorization: "deployment-token",
        requestId: expect.any(String),
        method: "POST",
        route: "/v1/h3/index"
      });
    } finally {
      await app.close();
    }
  });

  it("does not let header or body tenant spoofing alter an authenticated operation", async () => {
    const authenticator = vi.fn<Authenticator>(async () => principal([API_SCOPES.index], "tenant-a"));
    const app = await buildApp({ authentication: { mode: "required", authenticator } });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/h3/index",
        headers: { authorization: "deployment-token", "x-tenant-id": "tenant-b" },
        payload: { ...indexPayload, tenantId: "tenant-b" }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().data[0].index).toBe("892f5a32d97ffff");
      expect(authenticator).toHaveBeenCalledOnce();
      expect(authenticator.mock.calls[0]?.[0]).not.toHaveProperty("tenantId");
    } finally {
      await app.close();
    }
  });

  it("fails closed without leaking authenticator failures", async () => {
    const authenticator = vi.fn<Authenticator>(async () => {
      throw new Error("issuer secret and internal JWKS endpoint");
    });
    const app = await buildApp({ authentication: { mode: "required", authenticator } });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/h3/index",
        headers: { authorization: "opaque-value" },
        payload: indexPayload
      });
      assertAccessError(response, 401, "AUTHENTICATION_FAILED");
      expect(response.body).not.toMatch(/issuer|secret|jwks|opaque-value/i);
    } finally {
      await app.close();
    }
  });

  it("derives an immutable tenant context only from a validated principal", async () => {
    const authenticator: Authenticator = async () => principal([API_SCOPES.coverage], "verified-tenant");
    const policy = resolveAuthentication({ mode: "required", authenticator });
    const context = await authenticate(
      policy,
      {
        authorization: "credential",
        requestId: "request-1",
        method: "POST",
        route: "/v1/h3/coverage"
      },
      API_SCOPES.coverage
    );
    expect(context.tenantId).toBe("verified-tenant");
    expect(context.tenantId).toBe(context.principal.tenantId);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.principal)).toBe(true);
    expect(Object.isFrozen(context.principal.scopes)).toBe(true);
  });
});

describe("authentication configuration and OpenAPI", () => {
  it("rejects invalid and incomplete enabled authentication configuration", async () => {
    expect(() => loadServerConfig({ AUTH_MODE: "invalid" })).toThrow("AUTH_MODE");
    expect(() => loadServerConfig({ AUTH_MODE: "required" })).toThrow("authentication.authenticator");
    await expect(
      buildApp({ authentication: { mode: "invalid" as "required", authenticator: async () => null } })
    ).rejects.toThrow("authentication.mode");
  });

  it("accepts a required mode only with an injected authenticator", () => {
    const authenticator: Authenticator = async () => principal([API_SCOPES.index]);
    const config = loadServerConfig({ AUTH_MODE: "required" }, { authenticator });
    expect(config.app.authentication).toEqual({ mode: "required", authenticator });
    expect(loadServerConfig({}).app.authentication).toEqual({ mode: "local" });
  });

  it("publishes fixed scopes and 401/403 responses for every v1 operation", async () => {
    const app = await buildApp();
    const requiredApp = await buildApp({
      authentication: { mode: "required", authenticator: async () => principal(Object.values(API_SCOPES)) }
    });
    try {
      const document = app.swagger() as {
        paths: Record<
          string,
          Record<
            string,
            {
              security?: Array<Record<string, string[]>>;
              responses?: Record<string, unknown>;
              "x-required-scope"?: string;
              "x-auth-behavior"?: string;
            }
          >
        >;
      };
      const requiredDocument = requiredApp.swagger() as typeof document;
      const expected = new Map([
        ["/v1/h3/index", API_SCOPES.index],
        ["/v1/h3/polygon/cover", API_SCOPES.polygonCover],
        ["/v1/h3/neighbors", API_SCOPES.neighbors],
        ["/v1/h3/aggregate", API_SCOPES.aggregate],
        ["/v1/h3/coverage", API_SCOPES.coverage],
        ["/v1/h3/flow", API_SCOPES.flow]
      ]);

      for (const [path, scope] of expected) {
        const operation = document.paths[path]?.post;
        expect(operation, path).toBeDefined();
        expect(operation?.security, path).toEqual([]);
        expect(requiredDocument.paths[path]?.post?.security, path).toEqual([{ deploymentCredential: [] }]);
        expect(operation?.["x-required-scope"], path).toBe(scope);
        expect(operation?.responses?.["401"], path).toBeDefined();
        expect(operation?.responses?.["403"], path).toBeDefined();
      }

      for (const path of ["/health", "/ready"]) {
        const operation = document.paths[path]?.get;
        expect(operation?.security, path).toEqual([]);
        expect(operation?.["x-auth-behavior"], path).toBe("public");
      }
    } finally {
      await Promise.all([app.close(), requiredApp.close()]);
    }
  });
});

function assertAccessError(
  response: { statusCode: number; body: string; json(): { error: { code: string }; meta: unknown } },
  statusCode: 401 | 403,
  code: string
): void {
  expect(response.statusCode).toBe(statusCode);
  expect(response.json().error.code).toBe(code);
  expect(response.json().meta).toBeDefined();
  expect(response.body).not.toMatch(/(?:stack|node_modules|\.ts:\d+)/i);
}
