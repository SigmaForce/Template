import pg from "pg";
import { createClient } from "redis";

const { Client } = pg;

export class ReadinessService {
  constructor(service) {
    this.service = service;
    this.checks = [];
  }

  configure(checks) {
    this.checks = [...checks];
  }

  async inspect() {
    const dependencies = await Promise.all(
      this.checks.map(async ({ name, critical, probe, status }) => {
        if (!probe) {
          return { name, critical, status: status ?? "disabled" };
        }
        try {
          await probe();
          return { name, critical, status: "up" };
        } catch {
          return { name, critical, status: "down" };
        }
      }),
    );
    const criticalUnavailable = dependencies.some(
      ({ critical, status }) => critical && status !== "up",
    );
    const optionalUnavailable = dependencies.some(
      ({ critical, status }) =>
        !critical && (status === "down" || status === "misconfigured"),
    );

    return {
      service: this.service,
      status: criticalUnavailable
        ? "unready"
        : optionalUnavailable
          ? "degraded"
          : "ready",
      dependencies,
    };
  }
}

export function createPostgresProbe(databaseUrl, timeoutMilliseconds = 1_000) {
  return async () => {
    const client = new Client({
      connectionString: databaseUrl.toString(),
      connectionTimeoutMillis: timeoutMilliseconds,
      query_timeout: timeoutMilliseconds,
    });

    try {
      await client.connect();
      await client.query("SELECT 1");
    } finally {
      await client.end().catch(() => undefined);
    }
  };
}

export function createRedisProbe(redisUrl, timeoutMilliseconds = 1_000) {
  return async () => {
    const client = createClient({
      url: redisUrl.toString(),
      socket: {
        connectTimeout: timeoutMilliseconds,
        reconnectStrategy: false,
      },
    });
    client.on("error", () => undefined);

    try {
      await client.connect();
      const response = await client.ping();
      if (response !== "PONG") throw new Error("Redis did not answer PONG.");
    } finally {
      if (client.isOpen) await client.close();
    }
  };
}
