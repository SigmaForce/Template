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
      "APP_ENV=previewish",
      "LOG_LEVEL=verbose",
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
  assert.match(
    result.stderr,
    /APP_ENV must be one of development, test, staging, production/,
  );
  assert.match(result.stderr, /LOG_LEVEL must be one of debug, info, warn, error/);
});

test("startup accepts the documented local environment", () => {
  const result = runCheck(path.join(root, ".env.example"));

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Environment is valid/);
  assert.match(result.stdout, /PostHog: disabled/);
  assert.match(result.stdout, /Sentry: disabled/);
});

test("startup reports invalid optional telemetry as degraded without exposing values", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "saas-environment-"));
  const environmentFile = path.join(directory, ".env");

  writeFileSync(
    environmentFile,
    [
      "API_PORT=4000",
      "WORKER_PORT=4001",
      "NEXT_PUBLIC_API_URL=http://localhost:4000",
      "DATABASE_URL=postgresql://saas:saas@localhost:5432/saas",
      "REDIS_URL=redis://localhost:6379",
      "POSTHOG_KEY=phc_private-looking-value",
      "POSTHOG_HOST=not-a-url",
      "SENTRY_DSN=https://known-person@example.invalid/not-a-dsn",
    ].join("\n"),
  );

  const result = runCheck(environmentFile);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PostHog: misconfigured/);
  assert.match(result.stdout, /Sentry: misconfigured/);
  assert.doesNotMatch(
    `${result.stdout}${result.stderr}`,
    /private-looking-value|known-person/,
  );
});
