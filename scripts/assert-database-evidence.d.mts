export interface PlanAssertionResult {
  result: "index-plan-verified";
  plan: string;
  relation: string;
  requiredIndex: string;
  rootNode: string;
  actualRows: number;
  executionTimeMs: number;
}

export interface LogicalParityResult {
  result: "logical-restore-parity-verified";
  algorithm: string;
  tables: Record<"spatial_feature" | "h3_metric", { count: number; xor: string; sum: string }>;
}

export function assertPlanEvidence(
  path: string,
  expectedIndex: string,
  expectedRelation: string
): Promise<PlanAssertionResult>;

export function assertLogicalParity(sourcePath: string, restoredPath: string): Promise<LogicalParityResult>;
