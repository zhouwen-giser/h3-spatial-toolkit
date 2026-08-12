import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  benchmarkExitCode,
  evaluateBenchmark,
  formatEvaluation,
  parseBenchmarkResult,
  parseCorrectnessBaseline,
  parsePerformanceBaselines
} from "./gate.js";

const diagnostic = process.argv.includes("--diagnostic");
const resultArgument = process.argv.slice(2).find((argument) => argument !== "--" && argument !== "--diagnostic");
const resultPath = resolve(resultArgument ?? "benchmark/results/latest.json");
const [resultSource, correctnessSource, performanceSource] = await Promise.all([
  readFile(resultPath, "utf8"),
  readFile(new URL("./correctness-baseline.json", import.meta.url), "utf8"),
  readFile(new URL("./performance-baselines.json", import.meta.url), "utf8")
]);

const result = parseBenchmarkResult(JSON.parse(resultSource) as unknown);
const correctness = parseCorrectnessBaseline(JSON.parse(correctnessSource) as unknown);
const performance = parsePerformanceBaselines(JSON.parse(performanceSource) as unknown);
const evaluation = evaluateBenchmark(result, correctness, performance);

console.log(formatEvaluation(evaluation));
console.log(JSON.stringify(evaluation, null, 2));
process.exitCode = benchmarkExitCode(evaluation.status, diagnostic);
