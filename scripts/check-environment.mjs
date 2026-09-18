import path from "node:path";
import { loadEnvironment } from "./environment.mjs";

const environmentFile = path.resolve(process.argv[2] ?? ".env");

try {
  const environment = loadEnvironment(environmentFile);
  console.log("Environment is valid.");
  console.log(`PostHog: ${environment.telemetry.posthog.status}`);
  console.log(`Sentry: ${environment.telemetry.sentry.status}`);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Environment is invalid.",
  );
  process.exitCode = 1;
}
