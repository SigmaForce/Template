import { parseWebEnvironment } from "../../../scripts/environment-core.mjs";

export function getWebEnvironment() {
  return parseWebEnvironment(process.env);
}
