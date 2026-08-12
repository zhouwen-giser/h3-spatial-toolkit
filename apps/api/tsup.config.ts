import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/app.ts"],
  format: ["esm"],
  platform: "node",
  outDir: "dist",
  clean: true,
  noExternal: [/^@h3-toolkit\//]
});
