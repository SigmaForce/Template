import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const recipe = readFileSync(resolve(root, "docs/extensions/removal-recipes.md"), "utf8");

test("extension removal recipes cover every enabled extension", () => {
  for (const name of ["Audit Events", "Files", "API Keys", "Webhook Endpoints and Deliveries", "Operational Notifications", "Operator and localization extensions"]) {
    assert.match(recipe, new RegExp(`## ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
  for (const path of ["apps/api/src/audit-events", "apps/api/src/files", "apps/api/src/api-keys", "apps/api/src/webhooks", "apps/api/src/notifications", "apps/worker/src/webhooks", "apps/worker/src/notifications"]) {
    assert.equal(existsSync(resolve(root, path)), true, `recipe inventory path missing: ${path}`);
  }
});
