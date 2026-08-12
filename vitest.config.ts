import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@h3-toolkit/core": `${root}packages/core/src/index.ts`,
      "@h3-toolkit/geometry": `${root}packages/geometry/src/index.ts`,
      "@h3-toolkit/neighborhood": `${root}packages/neighborhood/src/index.ts`,
      "@h3-toolkit/aggregation": `${root}packages/aggregation/src/index.ts`,
      "@h3-toolkit/coverage": `${root}packages/coverage/src/index.ts`,
      "@h3-toolkit/flow": `${root}packages/flow/src/index.ts`,
      "@h3-toolkit/io": `${root}packages/io/src/index.ts`,
      "@h3-toolkit/postgis": `${root}packages/postgis/src/index.ts`
    }
  },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["packages/{core,geometry,neighborhood,aggregation,coverage,flow,io}/src/**/*.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 }
    }
  }
});
