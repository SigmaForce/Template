import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..", "..");
const command = path.join(root, "scripts", "check-environment.mjs");

function runCheck(environmentFile) {
  return spawnSync(process.execPath, [command, environmentFile], {
    cwd: root,
    encoding: "utf8",
    env: {},
  });
}

test("startup reports a missing environment file", () => {
  const result = runCheck(path.join(tmpdir(), "missing-saas-environment"));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing environment file/);
});

test("startup reports every invalid environment value", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "saas-environment-"));
  const environmentFile = path.join(directory, ".env");

  writeFileSync(
    environmentFile,
    [
      "API_PORT=not-a-port",
      "WORKER_PORT=70000",
      "NEXT_PUBLIC_API_URL=postgresql://localhost:4000",
      "DATABASE_URL=https://localhost:5432/saas",
      "REDIS_URL=ftp://localhost:6379",
    ].join("\n"),
  );

  const result = runCheck(environmentFile);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /API_PORT must be an integer between 1 and 65535/,
  );
  assert.match(
    result.stderr,
    /WORKER_PORT must be an integer between 1 and 65535/,
  );
  assert.match(result.stderr, /NEXT_PUBLIC_API_URL must use http: or https:/);
  assert.match(result.stderr, /DATABASE_URL must use postgresql: or postgres:/);
  assert.match(result.stderr, /REDIS_URL must use redis: or rediss:/);
});

test("startup accepts the documented local environment", () => {
  const result = runCheck(path.join(root, ".env.example"));

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Environment is valid/);
});
