import { existsSync } from "node:fs";

const requiredUrls = {
  DATABASE_URL: ["postgresql:", "postgres:"],
  REDIS_URL: ["redis:", "rediss:"],
  NEXT_PUBLIC_API_URL: ["http:", "https:"],
};
const requiredPorts = ["API_PORT", "WORKER_PORT"];

function validateUrl(name, value, allowedProtocols) {
  if (!value) {
    return `${name} is required`;
  }

  try {
    const url = new URL(value);

    if (!allowedProtocols.includes(url.protocol)) {
      return `${name} must use ${allowedProtocols.join(" or ")}`;
    }

    return null;
  } catch {
    return `${name} must be a valid URL`;
  }
}

function validatePort(name, value) {
  const port = Number(value);

  if (!value || !Number.isInteger(port) || port < 1 || port > 65_535) {
    return `${name} must be an integer between 1 and 65535`;
  }

  return null;
}

export function loadEnvironment(environmentFile) {
  if (!existsSync(environmentFile)) {
    throw new Error(
      `Missing environment file at ${environmentFile}. Copy .env.example to .env and review its values before starting.`,
    );
  }

  process.loadEnvFile(environmentFile);

  const errors = [
    ...requiredPorts.map((name) => validatePort(name, process.env[name])),
    ...Object.entries(requiredUrls).map(([name, protocols]) =>
      validateUrl(name, process.env[name], protocols),
    ),
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n- ${errors.join("\n- ")}`);
  }

  return process.env;
}
