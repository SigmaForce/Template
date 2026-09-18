import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const environmentFile = path.join(root, ".env");
const localDatabaseHosts = new Set(["127.0.0.1", "::1", "localhost"]);

function localDatabaseUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for bootstrap.`);

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !localDatabaseHosts.has(url.hostname)
  ) {
    throw new Error(
      `${name} must point to localhost during bootstrap; remote databases are never seeded.`,
    );
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(environmentFile)) {
  throw new Error("Missing .env. Copy .env.example to .env before bootstrap.");
}

process.loadEnvFile(environmentFile);
localDatabaseUrl("DATABASE_URL");
localDatabaseUrl("DIRECT_DATABASE_URL");

const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) {
  throw new Error("pnpm could not be located. Run this with corepack pnpm.");
}

run("docker", ["compose", "up", "-d", "postgres", "redis"]);
run(process.execPath, [
  pnpmCli,
  "--filter",
  "@saas/api",
  "db:migrate:deploy",
]);
run(process.execPath, [
  pnpmCli,
  "--filter",
  "@saas/api",
  "exec",
  "prisma",
  "db",
  "execute",
  "--file",
  "prisma/seed.sql",
]);

console.log("Local infrastructure, migrations, and synthetic seed are ready.");
