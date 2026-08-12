import { collectProductionPackages, packageIdentity } from "./production-packages.mjs";

const packages = await collectProductionPackages();
const failures = [];
const review = [];
for (const item of packages) {
  const pkg = item.packageJson;
  const license = typeof pkg.license === "string" ? pkg.license : (pkg.license?.type ?? "UNKNOWN");
  if (/\b(?:AGPL|SSPL|BUSL)\b|Commons Clause|Elastic License/i.test(license) || /(?:^|\s|\()GPL-(?:2|3)/i.test(license))
    failures.push(`${packageIdentity(item)}: forbidden license ${license}`);
  else if (license === "UNKNOWN" || /SEE LICENSE|UNLICENSED/i.test(license))
    review.push(`${packageIdentity(item)}: ${license}`);
}

if (failures.length) {
  console.error(JSON.stringify({ status: "failed", failures, review }, null, 2));
  process.exitCode = 1;
} else
  console.log(
    JSON.stringify(
      { status: "passed", productionPackages: packages.length, forbidden: 0, manualReview: review },
      null,
      2
    )
  );
