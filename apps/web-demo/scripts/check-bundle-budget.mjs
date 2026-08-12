import { gzipSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const budget = JSON.parse(await readFile(resolve(root, "BUNDLE_BUDGET.json"), "utf8"));
const html = await readFile(resolve(dist, "index.html"), "utf8");
const entryMatch = html.match(/<script[^>]+src="(?:\.\/|\/)assets\/([^"]+\.js)"/);
if (!entryMatch?.[1]) throw new Error("Unable to identify the JavaScript entry chunk from dist/index.html");

const names = (await readdir(resolve(dist, "assets"))).filter((name) => name.endsWith(".js")).sort();
const chunks = await Promise.all(
  names.map(async (name) => {
    const path = resolve(dist, "assets", name);
    const bytes = (await stat(path)).size;
    const gzipBytes = gzipSync(await readFile(path)).length;
    return { name: basename(path), bytes, gzipBytes, entry: name === entryMatch[1] };
  })
);
const failures = [];
const entry = chunks.find((chunk) => chunk.entry);
if (!entry) failures.push(`entry chunk ${entryMatch[1]} is missing`);
else {
  if (entry.bytes > budget.maxEntryBytes) failures.push(`entry bytes ${entry.bytes} > ${budget.maxEntryBytes}`);
  if (entry.gzipBytes > budget.maxEntryGzipBytes) {
    failures.push(`entry gzip bytes ${entry.gzipBytes} > ${budget.maxEntryGzipBytes}`);
  }
}

for (const chunk of chunks.filter((item) => !item.entry)) {
  if (chunk.bytes > budget.maxAsyncChunkBytes) {
    failures.push(`${chunk.name} bytes ${chunk.bytes} > ${budget.maxAsyncChunkBytes}`);
  }
  if (chunk.gzipBytes > budget.maxAsyncChunkGzipBytes) {
    failures.push(`${chunk.name} gzip bytes ${chunk.gzipBytes} > ${budget.maxAsyncChunkGzipBytes}`);
  }
}

const totalJavaScriptBytes = chunks.reduce((total, chunk) => total + chunk.bytes, 0);
if (totalJavaScriptBytes > budget.maxTotalJavaScriptBytes) {
  failures.push(`total JavaScript bytes ${totalJavaScriptBytes} > ${budget.maxTotalJavaScriptBytes}`);
}
for (const prefix of budget.requiredAsyncChunkPrefixes) {
  if (!chunks.some((chunk) => !chunk.entry && chunk.name.startsWith(prefix))) {
    failures.push(`required async chunk prefix is missing: ${prefix}`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "failed", failures, chunks, totalJavaScriptBytes }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "passed", chunks, totalJavaScriptBytes, budget }, null, 2));
}
