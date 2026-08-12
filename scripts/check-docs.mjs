import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

const root = resolve(process.cwd());
const ignored = new Set(["node_modules", ".git", "dist", "coverage", "release"]);
const files = await collect(root);
const markdown = files.filter((path) => extname(path) === ".md");
const failures = [];

for (const path of markdown) {
  const content = await readFile(path, "utf8");
  const relative = path.slice(root.length + 1);
  const fences = content.match(/^```/gm)?.length ?? 0;
  if (fences % 2 !== 0) failures.push(`${relative}: unbalanced fenced code blocks`);
  if (!content.endsWith("\n")) failures.push(`${relative}: missing final newline`);
  if (/sandbox:\/workspace\/scratch\//.test(content)) failures.push(`${relative}: contains transient sandbox path`);

  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim();
    if (!rawTarget || /^(?:https?:|mailto:|#|sandbox:)/.test(rawTarget)) continue;
    const target = rawTarget.split("#", 1)[0];
    if (!target) continue;
    try {
      await readdir(resolve(dirname(path), target));
    } catch {
      try {
        await readFile(resolve(dirname(path), target));
      } catch {
        failures.push(`${relative}: broken relative link ${rawTarget}`);
      }
    }
  }
}

const requiredHeadings = new Map([
  ["docs/18_DEVELOPMENT_PLAN.md", ["## 4. I0", "## 8. I4", "## 11. 变更控制"]],
  ["docs/19_ACCEPTANCE_GATES.md", ["## 3. G0", "## 10. G7", "## 11. 证据格式"]],
  ["docs/29_UNFINISHED_WORK_REGISTER.md", ["## 2. 未完成工作总表", "## 5. 状态更新规则"]]
]);
for (const [relative, headings] of requiredHeadings) {
  const content = await readFile(resolve(root, relative), "utf8").catch(() => "");
  for (const heading of headings)
    if (!content.includes(heading)) failures.push(`${relative}: missing heading ${heading}`);
}

finish({ markdownFiles: markdown.length }, failures);

async function collect(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await collect(path)));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function finish(summary, errors) {
  if (errors.length > 0) {
    console.error(JSON.stringify({ status: "failed", failures: errors }, null, 2));
    process.exitCode = 1;
  } else console.log(JSON.stringify({ status: "passed", ...summary }, null, 2));
}
