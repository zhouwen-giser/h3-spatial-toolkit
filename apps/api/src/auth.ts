export const AUTH_MODES = ["local", "required"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const API_SCOPES = {
  index: "h3:index",
  polygonCover: "h3:polygon:cover",
  neighbors: "h3:neighbors",
  aggregate: "h3:aggregate",
  coverage: "h3:coverage",
  flow: "h3:flow",
  metricsRead: "h3:metrics:read"
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

/** A deployment authenticator may only return identity claims it has already verified. */
export interface Principal {
  readonly subject: string;
  readonly tenantId: string;
  readonly scopes: readonly string[];
}

/**
 * Platform-neutral input for an injected authenticator. The API deliberately does not
 * pass tenant headers or request bodies across this trust boundary.
 */
export interface AuthenticationInput {
  readonly authorization: string;
  readonly requestId: string;
  readonly method: string;
  readonly route: string;
}

export type Authenticator = (input: AuthenticationInput) => Promise<Principal | null>;

export interface AuthenticationOptions {
  mode?: AuthMode;
  authenticator?: Authenticator;
}

export interface AuthenticationPolicy {
  readonly mode: AuthMode;
  readonly authenticator?: Authenticator;
}

export interface AuthContext {
  readonly principal: Principal;
  /** Always derived from principal.tenantId after successful authentication. */
  readonly tenantId: string;
}

export type AccessErrorCode = "AUTHENTICATION_REQUIRED" | "AUTHENTICATION_FAILED" | "AUTHORIZATION_DENIED";

export class AccessError extends Error {
  readonly statusCode: 401 | 403;
  readonly code: AccessErrorCode;

  constructor(statusCode: 401 | 403, code: AccessErrorCode, message: string) {
    super(message);
    this.name = "AccessError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function resolveAuthentication(options: AuthenticationOptions | undefined): AuthenticationPolicy {
  const mode = options?.mode ?? "local";
  if (!(AUTH_MODES as readonly string[]).includes(mode)) {
    throw new Error(`authentication.mode must be one of ${AUTH_MODES.join(", ")}`);
  }
  if (mode === "required" && typeof options?.authenticator !== "function") {
    throw new Error("authentication.authenticator is required when authentication.mode is required");
  }
  if (mode === "local" && options?.authenticator !== undefined) {
    throw new Error("authentication.authenticator requires authentication.mode to be required");
  }
  return options?.authenticator === undefined ? { mode } : { mode, authenticator: options.authenticator };
}

export async function authenticate(
  policy: AuthenticationPolicy,
  input: Omit<AuthenticationInput, "authorization"> & { authorization?: string },
  requiredScope: ApiScope
): Promise<AuthContext> {
  if (policy.mode !== "required" || policy.authenticator === undefined) {
    throw new Error("authenticate may only be called with required authentication");
  }

  if (input.authorization === undefined || input.authorization.trim() === "") {
    throw new AccessError(401, "AUTHENTICATION_REQUIRED", "Authentication credentials are required");
  }

  let principal: Principal | null;
  try {
    principal = normalizePrincipal(
      await policy.authenticator({
        authorization: input.authorization,
        requestId: input.requestId,
        method: input.method,
        route: input.route
      })
    );
  } catch {
    throw new AccessError(401, "AUTHENTICATION_FAILED", "Authentication credentials are invalid");
  }

  if (principal === null) {
    throw new AccessError(401, "AUTHENTICATION_FAILED", "Authentication credentials are invalid");
  }
  if (!principal.scopes.includes(requiredScope)) {
    throw new AccessError(403, "AUTHORIZATION_DENIED", "Required scope is not granted");
  }

  return Object.freeze({ principal, tenantId: principal.tenantId });
}

function normalizePrincipal(candidate: Principal | null): Principal | null {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    !nonEmpty(candidate.subject) ||
    !nonEmpty(candidate.tenantId) ||
    !Array.isArray(candidate.scopes) ||
    candidate.scopes.some((scope) => !nonEmpty(scope))
  ) {
    return null;
  }

  const scopes = Object.freeze([...new Set(candidate.scopes)]);
  return Object.freeze({ subject: candidate.subject, tenantId: candidate.tenantId, scopes });
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
