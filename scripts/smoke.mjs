import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEnvironment } from "./environment.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const environmentFile = path.join(root, ".env");
const pnpmCli = path.join(root, "node_modules", "pnpm", "bin", "pnpm.cjs");

try {
  loadEnvironment(environmentFile);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Environment is invalid.",
  );
  process.exit(1);
}

const apiPort = process.env.API_PORT;
const workerPort = process.env.WORKER_PORT;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

function runPnpm(args) {
  const result = spawnSync(process.execPath, [pnpmCli, ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Could not run pnpm: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `pnpm ${args.join(" ")} exited with code ${result.status ?? 1}.`,
    );
  }
}

function startService(name, cwd, entrypoint, args = [], environment = {}) {
  const child = spawn(process.execPath, [entrypoint, ...args], {
    cwd: path.join(root, cwd),
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`${name} could not start: ${error.message}`);
  });

  return { child, name };
}

async function waitForService({ child, name }, url) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${name} exited before becoming ready.`);
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // The service is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`${name} did not become ready at ${url} within 120 seconds.`);
}

async function stopService({ child }) {
  if (child.exitCode !== null) {
    return;
  }

  const closed = new Promise((resolve) => child.once("close", resolve));
  child.kill();
  await closed;
}

let services = [];
let exitCode = 0;

try {
  runPnpm(["run", "build"]);

  services = [
    startService("API", "apps/api", "dist/main.js", [], { API_PORT: apiPort }),
    startService(
      "web",
      "apps/web",
      "node_modules/next/dist/bin/next",
      ["start", "--hostname", "127.0.0.1", "--port", "3000"],
      { NEXT_PUBLIC_API_URL: apiUrl },
    ),
    startService("worker", "apps/worker", "dist/main.js", [], {
      WORKER_PORT: workerPort,
    }),
  ];

  await Promise.all([
    waitForService(services[0], `http://127.0.0.1:${apiPort}/v1/health`),
    waitForService(services[1], "http://127.0.0.1:3000"),
    waitForService(services[2], `http://127.0.0.1:${workerPort}/health`),
  ]);

  runPnpm(["exec", "playwright", "test"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Smoke test failed.");
  exitCode = 1;
} finally {
  await Promise.all(services.map(stopService));
}

process.exit(exitCode);
