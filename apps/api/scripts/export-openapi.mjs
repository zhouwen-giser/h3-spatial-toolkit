import { writeFile } from "node:fs/promises";
import { buildApp } from "../dist/app.js";

const app = await buildApp();
await writeFile(new URL("../openapi.json", import.meta.url), `${JSON.stringify(app.swagger(), null, 2)}\n`);
await app.close();
