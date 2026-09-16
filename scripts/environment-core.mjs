const environmentNames = ["development", "test", "staging", "production"];
const logLevels = ["debug", "info", "warn", "error"];
const rsaAlgorithmIdentifier = [
  0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
];

function readDerElement(bytes, offset, expectedTag) {
  if (bytes[offset] !== expectedTag || offset + 2 > bytes.length) {
    return undefined;
  }

  const encodedLength = bytes[offset + 1];
  let contentLength;
  let contentStart;

  if (encodedLength < 0x80) {
    contentLength = encodedLength;
    contentStart = offset + 2;
  } else {
    const lengthByteCount = encodedLength & 0x7f;
    if (
      lengthByteCount === 0 ||
      lengthByteCount > 4 ||
      offset + 2 + lengthByteCount > bytes.length ||
      bytes[offset + 2] === 0
    ) {
      return undefined;
    }

    contentLength = 0;
    for (let index = 0; index < lengthByteCount; index += 1) {
      contentLength = contentLength * 256 + bytes[offset + 2 + index];
    }
    if (contentLength < 0x80) return undefined;
    contentStart = offset + 2 + lengthByteCount;
  }

  const contentEnd = contentStart + contentLength;
  if (contentEnd > bytes.length) return undefined;

  return { contentStart, contentEnd, nextOffset: contentEnd };
}

function hasExactContents(bytes, element, expected) {
  if (element.contentEnd - element.contentStart !== expected.length) {
    return false;
  }

  return expected.every(
    (value, offset) => bytes[element.contentStart + offset] === value,
  );
}

function isCanonicalPositiveInteger(
  bytes,
  element,
  { minimumBytes, maximumBytes },
) {
  const length = element.contentEnd - element.contentStart;
  if (length === 0) return false;

  const first = bytes[element.contentStart];
  let unsignedStart = element.contentStart;

  if (first === 0) {
    if (length === 1 || (bytes[element.contentStart + 1] & 0x80) === 0) {
      return false;
    }
    unsignedStart += 1;
  } else if ((first & 0x80) !== 0) {
    return false;
  }

  const unsignedLength = element.contentEnd - unsignedStart;
  return (
    unsignedLength >= minimumBytes &&
    unsignedLength <= maximumBytes &&
    (bytes[element.contentEnd - 1] & 1) === 1
  );
}

function isPkcs1RsaPublicKey(bytes) {
  const sequence = readDerElement(bytes, 0, 0x30);
  if (!sequence || sequence.nextOffset !== bytes.length) return false;

  const modulus = readDerElement(bytes, sequence.contentStart, 0x02);
  if (!modulus) return false;
  const exponent = readDerElement(bytes, modulus.nextOffset, 0x02);
  if (!exponent || exponent.nextOffset !== sequence.contentEnd) return false;
  const exponentUnsignedStart =
    bytes[exponent.contentStart] === 0
      ? exponent.contentStart + 1
      : exponent.contentStart;
  const exponentIsGreaterThanOne =
    exponent.contentEnd - exponentUnsignedStart > 1 ||
    bytes[exponentUnsignedStart] > 1;

  return (
    isCanonicalPositiveInteger(bytes, modulus, {
      minimumBytes: 128,
      maximumBytes: Number.POSITIVE_INFINITY,
    }) &&
    isCanonicalPositiveInteger(bytes, exponent, {
      minimumBytes: 1,
      maximumBytes: 8,
    }) &&
    exponentIsGreaterThanOne
  );
}

function isSubjectPublicKeyInfo(bytes) {
  const sequence = readDerElement(bytes, 0, 0x30);
  if (!sequence || sequence.nextOffset !== bytes.length) return false;

  const algorithm = readDerElement(bytes, sequence.contentStart, 0x30);
  if (
    !algorithm ||
    !hasExactContents(bytes, algorithm, rsaAlgorithmIdentifier)
  ) {
    return false;
  }

  const publicKey = readDerElement(bytes, algorithm.nextOffset, 0x03);
  if (
    !publicKey ||
    publicKey.nextOffset !== sequence.contentEnd ||
    bytes[publicKey.contentStart] !== 0
  ) {
    return false;
  }

  return isPkcs1RsaPublicKey(
    bytes.slice(publicKey.contentStart + 1, publicKey.contentEnd),
  );
}

function isRsaPublicKeyPem(value) {
  const match = value.match(
    /^-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY)-----\n([A-Za-z0-9+/=\n]+)\n-----END \1-----$/,
  );
  if (!match) return false;

  const [, label, body] = match;
  const encoded = body.replaceAll("\n", "");
  if (encoded.length < 64 || encoded.length % 4 !== 0) return false;

  try {
    const decoded = atob(encoded);
    if (btoa(decoded) !== encoded) return false;

    const bytes = Uint8Array.from(decoded, (character) =>
      character.charCodeAt(0),
    );

    return label === "RSA PUBLIC KEY"
      ? isPkcs1RsaPublicKey(bytes)
      : isSubjectPublicKeyInfo(bytes);
  } catch {
    return false;
  }
}

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

function parseAuthentication(environment, errors) {
  const secretKey = environment.CLERK_SECRET_KEY?.trim();
  const jwtKey = environment.CLERK_JWT_KEY?.trim().replaceAll("\\n", "\n");
  const authorizedPartiesValue = environment.CLERK_AUTHORIZED_PARTIES?.trim();
  const authorizedParties = [];

  if (!secretKey) {
    errors.push("CLERK_SECRET_KEY is required for Organization management");
  }

  if (
    secretKey &&
    (secretKey.includes("replace-with") ||
      !/^sk_(?:test|live)_[A-Za-z0-9_-]{8,}$/.test(secretKey))
  ) {
    errors.push("CLERK_SECRET_KEY must be a valid Clerk secret key");
  }

  if (jwtKey) {
    if (!isRsaPublicKeyPem(jwtKey)) {
      errors.push("CLERK_JWT_KEY must be a valid RSA PEM public key");
    }
  }

  if (!authorizedPartiesValue) {
    errors.push("CLERK_AUTHORIZED_PARTIES is required");
  } else {
    for (const value of authorizedPartiesValue
      .split(",")
      .map((item) => item.trim())) {
      try {
        const url = new URL(value);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.origin !== value
        ) {
          throw new Error("not an HTTP origin");
        }
        authorizedParties.push(url.origin);
      } catch {
        errors.push(
          "CLERK_AUTHORIZED_PARTIES must contain comma-separated HTTP origins",
        );
        break;
      }
    }
  }

  return { secretKey, jwtKey, authorizedParties };
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
    throw new Error(
      `Invalid ${service} environment:\n- ${errors.join("\n- ")}`,
    );
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
  const errors = [];
  let runtime;

  try {
    runtime = parseRuntime(environment, "api");
  } catch (error) {
    if (error instanceof Error) {
      errors.push(...error.message.split("\n").slice(1));
    }
  }

  const authentication = parseAuthentication(environment, errors);

  if (errors.length > 0) {
    throw new Error(`Invalid api environment:\n- ${errors.join("\n- ")}`);
  }

  return { ...runtime, authentication };
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
  const clerkPublishableKey =
    environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  if (!clerkPublishableKey) {
    errors.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required");
  } else if (
    clerkPublishableKey.includes("replace-with") ||
    !/^pk_(?:test|live)_[A-Za-z0-9_-]{8,}$/.test(clerkPublishableKey)
  ) {
    errors.push(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid Clerk publishable key",
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid web environment:\n- ${errors.join("\n- ")}`);
  }

  return {
    service: "web",
    environment: environmentName,
    logLevel,
    apiUrl,
    authentication: { publishableKey: clerkPublishableKey },
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
