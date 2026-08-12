import { describe, expect, it } from "vitest";
import { summarizeSarif } from "../scripts/container-supply-chain.mjs";

describe("container vulnerability summary", () => {
  it("counts severities and fix availability without suppressing findings", () => {
    const summary = summarizeSarif({
      runs: [
        {
          tool: {
            driver: {
              rules: [
                {
                  id: "CVE-ONE",
                  properties: {
                    cvssV3_severity: "CRITICAL",
                    fixed_version: "2.0.0",
                    purls: ["pkg:npm/example@1.0.0"]
                  }
                },
                {
                  id: "CVE-TWO",
                  properties: {
                    cvssV3_severity: "HIGH",
                    fixed_version: "not fixed",
                    purls: ["pkg:deb/debian/example@1"]
                  }
                }
              ]
            }
          }
        }
      ]
    });

    expect(summary).toMatchObject({
      total: 2,
      vulnerablePackages: 2,
      critical: 1,
      high: 1,
      fixable: 1,
      unfixable: 1
    });
    expect(summary.findings).toEqual([
      {
        cve: "CVE-ONE",
        severity: "CRITICAL",
        package: "pkg:npm/example@1.0.0",
        fixedVersion: "2.0.0"
      },
      {
        cve: "CVE-TWO",
        severity: "HIGH",
        package: "pkg:deb/debian/example@1",
        fixedVersion: "not fixed"
      }
    ]);
  });

  it("accepts an empty SARIF result as zero findings", () => {
    expect(summarizeSarif({ runs: [] })).toEqual({
      total: 0,
      vulnerablePackages: 0,
      critical: 0,
      high: 0,
      fixable: 0,
      unfixable: 0,
      findings: []
    });
  });
});
