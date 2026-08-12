import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface Component {
  "bom-ref": string;
  name: string;
  version: string;
  purl: string;
  licenses: Array<{ expression: string }>;
}

interface Bom {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  metadata: { component: Component };
  components: Component[];
  dependencies: Array<{ ref: string; dependsOn: string[] }>;
}

const bom = JSON.parse(await readFile(new URL("../sbom/cyclonedx-bom.json", import.meta.url), "utf8")) as Bom;

describe("production SBOM", () => {
  it("has stable CycloneDX identity and a complete reference graph", () => {
    expect(bom.bomFormat).toBe("CycloneDX");
    expect(bom.specVersion).toBe("1.6");
    expect(bom.serialNumber).toMatch(/^urn:uuid:[0-9a-f-]{36}$/);
    const refs = [bom.metadata.component["bom-ref"], ...bom.components.map((item) => item["bom-ref"])];
    expect(new Set(refs).size).toBe(refs.length);
    for (const dependency of bom.dependencies) {
      expect(refs).toContain(dependency.ref);
      for (const target of dependency.dependsOn) expect(refs).toContain(target);
    }
  });

  it("identifies every component by purl, version and license expression", () => {
    expect(bom.components.length).toBeGreaterThan(50);
    for (const component of bom.components) {
      expect(component["bom-ref"]).toBe(component.purl);
      expect(component.version).not.toBe("");
      expect(component.licenses[0]?.expression).not.toMatch(/^(?:NOASSERTION|UNKNOWN)$/);
    }
  });
});
