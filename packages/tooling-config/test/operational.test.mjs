import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeForLog } from "../src/redaction.mjs";
import { ReadinessService } from "../src/readiness.mjs";
import {
  billingProjectionJobOptions,
  createRedisClient,
} from "../src/billing-queue.mjs";

test("redaction removes known PII and credentials from nested log data", () => {
  assert.deepEqual(
    sanitizeForLog({
      path: "/users/person@example.com?token=path-secret",
      authorization: "Bearer header-secret",
      nested: { payload: "private-payload", phone: "+55 65 99999-9999" },
    }),
    {
      path: "/users/[REDACTED]?token=[REDACTED]",
      authorization: "[REDACTED]",
      nested: { payload: "[REDACTED]", phone: "[REDACTED]" },
    },
  );
});

test("a misconfigured optional integration degrades readiness", async () => {
  const readiness = new ReadinessService("web");
  readiness.configure([
    { name: "api", critical: true, probe: async () => undefined },
    { name: "posthog", critical: false, status: "misconfigured" },
    { name: "sentry", critical: false, status: "disabled" },
  ]);

  assert.equal((await readiness.inspect()).status, "degraded");
});

test("billing projection retries are bounded and failed jobs are retained", () => {
  assert.deepEqual(billingProjectionJobOptions, {
    attempts: 5,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: { age: 3_600, count: 1_000 },
    removeOnFail: { age: 604_800, count: 1_000 },
    stackTraceLimit: 5,
  });
});

test("billing workers use the installed native Redis client", () => {
  const client = createRedisClient(new URL("redis://localhost:6379"));
  assert.equal(typeof client.sendCommand, "function");
  assert.equal(client.isOpen, false);
});
