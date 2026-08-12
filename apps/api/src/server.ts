import { buildApp } from "./app.js";
import { loadServerConfig } from "./config.js";

const config = loadServerConfig();
const app = await buildApp(config.app);

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await app.close();
    process.exitCode = 0;
  } catch (error) {
    app.log.error({ errorName: error instanceof Error ? error.name : typeof error }, "Graceful shutdown failed");
    process.exitCode = 1;
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
if (process.env.H3_TOOLKIT_TEST_SHUTDOWN_IPC === "YES" && typeof process.send === "function") {
  process.once("message", async (message) => {
    if (message !== "shutdown") return;
    await shutdown();
    if (process.connected && typeof process.disconnect === "function") process.disconnect();
  });
}

await app.listen({
  host: config.host,
  port: config.port
});
