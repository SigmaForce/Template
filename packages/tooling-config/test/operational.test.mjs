import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeForLog } from "../src/redaction.mjs";
import { ReadinessService } from "../src/readiness.mjs";

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
