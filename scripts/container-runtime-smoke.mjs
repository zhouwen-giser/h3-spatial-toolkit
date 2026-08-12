import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const image = process.argv[2] ?? "h3-spatial-toolkit-api:latest";
const container = `h3-api-runtime-smoke-${process.pid}`;

try {
  await docker(["run", "--detach", "--name", container, image]);
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    const result = await docker(
      ["exec", container, "node", "-e", "fetch('http://127.0.0.1:3000/ready').then(r=>{if(!r.ok)process.exit(1)})"],
      true
    );
    if (result.exitCode === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("API container did not become ready within 30 seconds");

  const configuredUser = (await docker(["inspect", "--format", "{{.Config.User}}", container])).stdout.trim();
  const runtime = await docker([
    "exec",
    container,
    "sh",
    "-c",
    String.raw`set -eu
test "$(id -u)" -ne 0
for command in npm npx corepack pnpm pnpx yarn yarnpkg; do
  if command -v "$command" >/dev/null 2>&1; then echo "unexpected_command=$command"; exit 1; fi
done
echo PASS`
  ]);
  if (configuredUser !== "node" || !runtime.stdout.trim().endsWith("PASS")) {
    throw new Error("API image runtime user or package-manager inspection failed");
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        image,
        imageId: (await docker(["image", "inspect", "--format", "{{.Id}}", image])).stdout.trim(),
        configuredUser,
        readiness: "PASS",
        command: "node dist/server.js",
        packageManagersAbsent: ["npm", "npx", "corepack", "pnpm", "pnpx", "yarn", "yarnpkg"]
      },
      null,
      2
    )
  );
} finally {
  await docker(["rm", "--force", container], true);
}

async function docker(args, allowFailure = false) {
  try {
    const result = await execFile("docker", args, { maxBuffer: 16 * 1024 * 1024 });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (allowFailure) {
      return {
        exitCode: error.code ?? 1,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? String(error)
      };
    }
    throw error;
  }
}
