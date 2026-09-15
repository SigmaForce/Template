import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEnvironment } from "./environment.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const environmentFile = path.join(root, ".env");

try {
  loadEnvironment(environmentFile);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Environment is invalid.",
  );
  process.exit(1);
}

const compose = spawnSync("docker", ["compose", "up", "-d"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (compose.status !== 0) {
  console.error("Docker Compose could not start PostgreSQL and Redis.");
  process.exit(compose.status ?? 1);
}

const pnpmCli = process.env.npm_execpath;

if (!pnpmCli) {
  console.error(
    "pnpm could not be located. Start this command with corepack pnpm dev.",
  );
  process.exit(1);
}

const applications = spawn(
  process.execPath,
  [pnpmCli, "exec", "turbo", "run", "dev"],
  {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => applications.kill(signal));
}

applications.on("exit", (code) => process.exit(code ?? 0));
