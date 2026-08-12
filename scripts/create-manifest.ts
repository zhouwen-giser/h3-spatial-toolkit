import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = resolve(process.cwd());
const ignored = new Set(["node_modules", ".git", "dist", "MANIFEST.json", "SHA256SUMS"]);

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (
      ignored.has(entry.name) ||
      entry.name.endsWith(".zip") ||
      (directory === root && ["coverage", "release", "output"].includes(entry.name))
    )
      continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const files = await filesIn(root);
const template = JSON.parse(await readFile(resolve(root, "template.json"), "utf8")) as {
  templateName: string;
  templateVersion: string;
  projectName: string;
  projectVersion: string;
  entryDocument: string;
};
const manifest = {
  name: template.templateName,
  version: template.templateVersion,
  projectBaseline: `${template.projectName}@${template.projectVersion}`,
  entryDocument: template.entryDocument,
  generatedAt: new Date(Number(process.env.SOURCE_DATE_EPOCH ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  fileCount: files.length,
  files: await Promise.all(
    files.map(async (path) => ({
      path: relative(root, path).replaceAll("\\", "/"),
      size: (await stat(path)).size,
      sha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex")
    }))
  )
};

await writeFile(resolve(root, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`MANIFEST.json: ${manifest.fileCount} files`);
