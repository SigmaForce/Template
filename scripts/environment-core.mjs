const environmentNames = ["development", "test", "staging", "production"];
const logLevels = ["debug", "info", "warn", "error"];

function parseChoice(name, value, choices, defaultValue, errors) {
  const candidate = value || defaultValue;
  if (!choices.includes(candidate)) {
    errors.push(`${name} must be one of ${choices.join(", ")}`);
    return defaultValue;
  }
  return candidate;
}

function parseUrl(name, value, allowedProtocols, errors) {
  if (!value) {
    errors.push(`${name} is required`);
    return undefined;
  }
  try {
    const url = new URL(value);
    if (!allowedProtocols.includes(url.protocol)) {
      errors.push(`${name} must use ${allowedProtocols.join(" or ")}`);
      return undefined;
    }
    return url;
  } catch {
    errors.push(`${name} must be a valid URL`);
    return undefined;
  }
}

function parsePort(name, value, errors) {
  const port = Number(value);
  if (!value || !Number.isInteger(port) || port < 1 || port > 65_535) {
    errors.push(`${name} must be an integer between 1 and 65535`);
    return undefined;
  }
  return port;
}

function parsePostHog(environment) {
  const key = environment.POSTHOG_KEY;
  const host = environment.POSTHOG_HOST;
  if (!key && !host) return { status: "disabled" };
  if (!key || !host) return { status: "misconfigured" };

  try {
    const url = new URL(host);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { status: "misconfigured" };
    }
    return { status: "configured", key, host: url };
  } catch {
    return { status: "misconfigured" };
  }
}

function parseSentry(environment) {
  const dsn = environment.SENTRY_DSN;
  if (!dsn) return { status: "disabled" };

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split("/").filter(Boolean).at(-1);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.username ||
      !projectId ||
      !/^\d+$/.test(projectId)
    ) {
      return { status: "misconfigured" };
    }
    return { status: "configured", dsn: url };
  } catch {
    return { status: "misconfigured" };
  }
}

function parseRuntime(environment, service) {
  const errors = [];
  const environmentName = parseChoice(
    "APP_ENV",
    environment.APP_ENV,
    environmentNames,
    "development",
    errors,
  );
  const logLevel = parseChoice(
    "LOG_LEVEL",
    environment.LOG_LEVEL,
    logLevels,
    "info",
    errors,
  );
  const portName = service === "api" ? "API_PORT" : "WORKER_PORT";
  const port = parsePort(portName, environment[portName], errors);
  const databaseUrl = parseUrl(
    "DATABASE_URL",
    environment.DATABASE_URL,
    ["postgresql:", "postgres:"],
    errors,
  );
  const redisUrl = parseUrl(
    "REDIS_URL",
    environment.REDIS_URL,
    ["redis:", "rediss:"],
    errors,
  );

  if (errors.length > 0) {
    throw new Error(`Invalid ${service} environment:\n- ${errors.join("\n- ")}`);
  }

  return {
    service,
    environment: environmentName,
    logLevel,
    port,
    databaseUrl,
    redisUrl,
    telemetry: {
      posthog: parsePostHog(environment),
      sentry: parseSentry(environment),
    },
  };
}

export function parseApiEnvironment(environment) {
  return parseRuntime(environment, "api");
}

export function parseWorkerEnvironment(environment) {
  return parseRuntime(environment, "worker");
}

export function parseWebEnvironment(environment) {
  const errors = [];
  const apiUrl = parseUrl(
    "NEXT_PUBLIC_API_URL",
    environment.NEXT_PUBLIC_API_URL,
    ["http:", "https:"],
    errors,
  );
  const environmentName = parseChoice(
    "APP_ENV",
    environment.APP_ENV,
    environmentNames,
    "development",
    errors,
  );
  const logLevel = parseChoice(
    "LOG_LEVEL",
    environment.LOG_LEVEL,
    logLevels,
    "info",
    errors,
  );

  if (errors.length > 0) {
    throw new Error(`Invalid web environment:\n- ${errors.join("\n- ")}`);
  }

  return {
    service: "web",
    environment: environmentName,
    logLevel,
    apiUrl,
    telemetry: {
      posthog: parsePostHog(environment),
      sentry: parseSentry(environment),
    },
  };
}

export function parseFoundationEnvironment(environment) {
  const errors = [];
  let api;
  let worker;
  let web;

  for (const [name, parse] of [
    ["api", parseApiEnvironment],
    ["worker", parseWorkerEnvironment],
    ["web", parseWebEnvironment],
  ]) {
    try {
      const value = parse(environment);
      if (name === "api") api = value;
      if (name === "worker") worker = value;
      if (name === "web") web = value;
    } catch (error) {
      if (error instanceof Error) {
        errors.push(...error.message.split("\n").slice(1));
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n${[...new Set(errors)].join("\n")}`);
  }

  return { api, worker, web, telemetry: api.telemetry };
}
