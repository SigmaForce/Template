import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { parseApiEnvironment } from "../../scripts/environment-core.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const command = path.join(root, "scripts", "check-environment.mjs");

function runCheck(environmentFile) {
  return spawnSync(process.execPath, [command, environmentFile], {
    cwd: root,
    encoding: "utf8",
    env: {},
  });
}

function apiEnvironment(authentication) {
  return {
    API_PORT: "4000",
    DATABASE_URL: "postgresql://saas:saas@localhost:5432/saas",
    REDIS_URL: "redis://localhost:6379",
    CLERK_AUTHORIZED_PARTIES: "http://localhost:3000",
    STRIPE_LAUNCH_PRICE_ID: "price_launchTest",
    STRIPE_LAUNCH_PRODUCT_ID: "prod_launchTest",
    STRIPE_SCALE_PRICE_ID: "price_scaleTest",
    STRIPE_SCALE_PRODUCT_ID: "prod_scaleTest",
    ...authentication,
  };
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
  assert.match(
    result.stderr,
    /LOG_LEVEL must be one of debug, info, warn, error/,
  );
  assert.match(
    result.stderr,
    /CLERK_SECRET_KEY is required for Organization management/,
  );
  assert.match(result.stderr, /CLERK_AUTHORIZED_PARTIES is required/);
  assert.match(result.stderr, /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required/);
});

test("startup rejects the documented Clerk placeholders", () => {
  const result = runCheck(path.join(root, ".env.example"));

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /CLERK_SECRET_KEY must be a valid Clerk secret key/,
  );
  assert.match(
    result.stderr,
    /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid Clerk publishable key/,
  );
});

test("startup accepts a configured local environment", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "saas-environment-"));
  const environmentFile = path.join(directory, ".env");
  const configuredEnvironment = readFileSync(
    path.join(root, ".env.example"),
    "utf8",
  )
    .replace(
      "replace-with-clerk-publishable-key",
      "pk_test_dGVzdC5jbGVyay5hY2NvdW50cy5kZXYk",
    )
    .replace(
      "replace-with-clerk-secret-key",
      "sk_test_c3ludGhldGljLW5vdC1hLXJlYWwta2V5",
    );

  writeFileSync(environmentFile, configuredEnvironment);

  const result = runCheck(environmentFile);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Environment is valid/);
  assert.match(result.stdout, /PostHog: disabled/);
  assert.match(result.stdout, /Sentry: disabled/);
});

test("startup requires Clerk keys and an authorized frontend origin", () => {
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
    ].join("\n"),
  );

  const result = runCheck(environmentFile);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /CLERK_SECRET_KEY is required for Organization management/,
  );
  assert.match(result.stderr, /CLERK_AUTHORIZED_PARTIES is required/);
  assert.match(result.stderr, /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required/);
});

test("startup rejects a malformed Clerk JWT public key", () => {
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
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dGVzdC5jbGVyay5hY2NvdW50cy5kZXYk",
      "CLERK_SECRET_KEY=sk_test_c3ludGhldGljLW5vdC1hLXJlYWwta2V5",
      "CLERK_JWT_KEY=replace-with-clerk-jwt-public-key",
      "CLERK_AUTHORIZED_PARTIES=http://localhost:3000",
    ].join("\n"),
  );

  const result = runCheck(environmentFile);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /CLERK_JWT_KEY must be a valid RSA PEM public key/,
  );
});

test("API environment accepts a structurally valid RSA public key", () => {
  const { publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  assert.doesNotThrow(() =>
    parseApiEnvironment(
      apiEnvironment({
        CLERK_SECRET_KEY: "sk_test_c3ludGhldGljLW5vdC1hLXJlYWwta2V5",
        CLERK_JWT_KEY: publicKey,
      }),
    ),
  );
});

test("API environment validates server-only Stripe Plan mappings", () => {
  const configuration = parseApiEnvironment(
    apiEnvironment({
      CLERK_SECRET_KEY: "sk_test_c3ludGhldGljLW5vdC1hLXJlYWwta2V5",
    }),
  );

  assert.deepEqual(configuration.stripePlanMappings, {
    launch: {
      priceId: "price_launchTest",
      productId: "prod_launchTest",
    },
    scale: {
      priceId: "price_scaleTest",
      productId: "prod_scaleTest",
    },
  });

  assert.throws(
    () =>
      parseApiEnvironment({
        ...apiEnvironment({
          CLERK_SECRET_KEY: "sk_test_c3ludGhldGljLW5vdC1hLXJlYWwta2V5",
        }),
        STRIPE_LAUNCH_PRICE_ID: "launch-price",
        STRIPE_SCALE_PRODUCT_ID: "",
      }),
    /STRIPE_LAUNCH_PRICE_ID must be a valid Stripe price ID[\s\S]*STRIPE_SCALE_PRODUCT_ID is required/,
  );
});

test("API environment requires a Clerk secret even with a JWT public key", () => {
  const { publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  assert.throws(
    () => parseApiEnvironment(apiEnvironment({ CLERK_JWT_KEY: publicKey })),
    /CLERK_SECRET_KEY is required for Organization management/,
  );
});

test("API environment rejects malformed DER inside valid PEM armor", () => {
  const malformedDer = Buffer.alloc(64);
  malformedDer[0] = 0x30;
  const malformedPem = [
    "-----BEGIN RSA PUBLIC KEY-----",
    malformedDer.toString("base64"),
    "-----END RSA PUBLIC KEY-----",
  ].join("\n");

  assert.throws(
    () =>
      parseApiEnvironment(
        apiEnvironment({
          CLERK_SECRET_KEY: "sk_test_c3ludGhldGljLW5vdC1hLXJlYWwta2V5",
          CLERK_JWT_KEY: malformedPem,
        }),
      ),
    /CLERK_JWT_KEY must be a valid RSA PEM public key/,
  );
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
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dGVzdC5jbGVyay5hY2NvdW50cy5kZXYk",
      "CLERK_SECRET_KEY=sk_test_c3ludGhldGljLW5vdC1hLXJlYWwta2V5",
      "CLERK_AUTHORIZED_PARTIES=http://localhost:3000",
      "STRIPE_LAUNCH_PRODUCT_ID=prod_launchTest",
      "STRIPE_LAUNCH_PRICE_ID=price_launchTest",
      "STRIPE_SCALE_PRODUCT_ID=prod_scaleTest",
      "STRIPE_SCALE_PRICE_ID=price_scaleTest",
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
