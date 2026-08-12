import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error The production script is intentionally native ESM without a declaration file.
import { PRODUCTION_REQUIRED_GATES, SOURCE_REQUIRED_GATES, evaluateReleasePolicy } from "../scripts/release-policy.mjs";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("release policy", () => {
  it("classifies a locally certified source template without claiming production readiness", async () => {
    const root = await fixture({ source: "PASS", production: "NOT_RUN", productionRelease: "BLOCKED" });
    const result = await evaluateReleasePolicy(root);

    expect(result.failures).toEqual([]);
    expect(result.classification).toBe("SOURCE_TEMPLATE_READY");
    expect(result.sourceUnresolved).toEqual([]);
    expect(result.productionUnresolved.length).toBeGreaterThan(0);
  });

  it("blocks a source release when a required local gate is unresolved", async () => {
    const root = await fixture({ source: "PARTIAL", production: "NOT_RUN", productionRelease: "BLOCKED" });
    const result = await evaluateReleasePolicy(root);

    expect(result.classification).toBe("SOURCE_TEMPLATE_BLOCKED");
    expect(result.failures).toContainEqual(expect.stringContaining("source release gates are unresolved"));
  });

  it("rejects a production PASS while any production gate is unresolved", async () => {
    const root = await fixture({ source: "PASS", production: "NOT_RUN", productionRelease: "PASS" });
    const result = await evaluateReleasePolicy(root);

    expect(result.failures).toContain(
      "G7_PRODUCTION_RELEASE cannot be PASS while production-required gates are unresolved"
    );
  });

  it("uses release-candidate classification until the production release gate is approved", async () => {
    const root = await fixture({ source: "PASS", production: "PASS", productionRelease: "BLOCKED" });
    const result = await evaluateReleasePolicy(root);

    expect(result.failures).toEqual([]);
    expect(result.classification).toBe("RELEASE_CANDIDATE");
  });
});

interface FixtureOptions {
  source: string;
  production: string;
  productionRelease: string;
}

async function fixture({ source, production, productionRelease }: FixtureOptions): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "h3-release-policy-test-"));
  directories.push(root);
  await mkdir(resolve(root, ".codex"), { recursive: true });
  const gates: Record<string, string> = Object.fromEntries(
    PRODUCTION_REQUIRED_GATES.map((gate: string) => [gate, production])
  );
  for (const gate of SOURCE_REQUIRED_GATES as string[]) gates[gate] = source;
  gates.G7_PRODUCTION_RELEASE = productionRelease;
  await Promise.all([
    json(root, "package.json", { version: "0.2.0" }),
    json(root, "template.json", { templateVersion: "1.3.0" }),
    json(root, ".codex/project-state.json", { gates, blockers: ["target platform unavailable"] }),
    writeFile(
      resolve(root, "CHANGELOG.md"),
      "# Changelog\n\n## [Unreleased]\n\nTemplate `1.3.0`.\n\n## [0.2.0]\n",
      "utf8"
    )
  ]);
  return root;
}

async function json(root: string, path: string, value: unknown): Promise<void> {
  await writeFile(resolve(root, path), `${JSON.stringify(value)}\n`, "utf8");
}
