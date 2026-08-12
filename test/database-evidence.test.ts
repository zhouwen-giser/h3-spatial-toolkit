import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertLogicalParity, assertPlanEvidence } from "../scripts/assert-database-evidence.mjs";

describe("database certification evidence assertions", () => {
  it("requires the named index, executed rows and buffer evidence", async () => {
    const path = await temporaryJson([
      {
        Plan: {
          "Node Type": "Index Scan",
          "Relation Name": "spatial_feature",
          "Index Name": "spatial_feature_h3_bix",
          "Actual Rows": 2,
          "Actual Loops": 1,
          "Shared Hit Blocks": 3
        },
        "Execution Time": 0.1
      }
    ]);

    await expect(assertPlanEvidence(path, "spatial_feature_h3_bix", "spatial_feature")).resolves.toMatchObject({
      result: "index-plan-verified",
      actualRows: 2
    });
  });

  it("rejects a sequential-scan fallback even when another branch names the index", async () => {
    const path = await temporaryJson([
      {
        Plan: {
          "Node Type": "Nested Loop",
          "Actual Rows": 1,
          "Actual Loops": 1,
          Plans: [
            {
              "Node Type": "Index Scan",
              "Relation Name": "spatial_feature",
              "Index Name": "spatial_feature_h3_bix",
              "Actual Rows": 1,
              "Actual Loops": 1,
              "Shared Hit Blocks": 1
            },
            {
              "Node Type": "Seq Scan",
              "Relation Name": "spatial_feature",
              "Actual Rows": 1,
              "Actual Loops": 1
            }
          ]
        },
        "Execution Time": 0.1
      }
    ]);

    await expect(assertPlanEvidence(path, "spatial_feature_h3_bix", "spatial_feature")).rejects.toThrow(
      "fell back to a sequential scan"
    );
  });

  it("compares non-empty source and restored logical fingerprints exactly", async () => {
    const fingerprint = {
      algorithm: "postgres-hashtextextended-seed-0-xor-and-sum-v1",
      spatial_feature: { count: 2, xor: "1", sum: "3" },
      h3_metric: { count: 1, xor: "4", sum: "4" }
    };
    const source = await temporaryJson(fingerprint);
    const restored = await temporaryJson(fingerprint);
    await expect(assertLogicalParity(source, restored)).resolves.toMatchObject({
      result: "logical-restore-parity-verified"
    });

    const mismatched = await temporaryJson({
      ...fingerprint,
      h3_metric: { count: 1, xor: "5", sum: "5" }
    });
    await assert.rejects(assertLogicalParity(source, mismatched), /logical checksums differ/);
  });
});

async function temporaryJson(value: unknown): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "h3-database-evidence-"));
  const path = join(directory, "evidence.json");
  await writeFile(path, JSON.stringify(value), "utf8");
  return path;
}
