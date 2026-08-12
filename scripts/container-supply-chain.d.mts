export interface VulnerabilityFinding {
  cve: string;
  severity: string;
  package: string;
  fixedVersion: string;
}

export interface VulnerabilitySummary {
  total: number;
  vulnerablePackages: number;
  critical: number;
  high: number;
  fixable: number;
  unfixable: number;
  findings: VulnerabilityFinding[];
}

export function summarizeSarif(sarif: unknown): VulnerabilitySummary;
