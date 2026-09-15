import path from "node:path";
import { loadEnvironment } from "./environment.mjs";

const environmentFile = path.resolve(process.argv[2] ?? ".env");

try {
  loadEnvironment(environmentFile);
  console.log("Environment is valid.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Environment is invalid.",
  );
  process.exitCode = 1;
}
