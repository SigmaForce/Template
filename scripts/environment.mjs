import { existsSync } from "node:fs";
import { parseFoundationEnvironment } from "./environment-core.mjs";

export * from "./environment-core.mjs";

export function loadEnvironment(environmentFile) {
  if (!existsSync(environmentFile)) {
    throw new Error(
      `Missing environment file at ${environmentFile}. Copy .env.example to .env and review its values before starting.`,
    );
  }

  process.loadEnvFile(environmentFile);
  return parseFoundationEnvironment(process.env);
}
