export type EnvironmentName = "development" | "test" | "staging" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";

export type OptionalIntegration<T extends object> =
  { status: "disabled" | "misconfigured" } | ({ status: "configured" } & T);

export interface TelemetryConfiguration {
  posthog: OptionalIntegration<{ key: string; host: URL }>;
  sentry: OptionalIntegration<{ dsn: URL }>;
}

interface RuntimeEnvironment {
  environment: EnvironmentName;
  logLevel: LogLevel;
  port: number;
  databaseUrl: URL;
  redisUrl: URL;
  telemetry: TelemetryConfiguration;
}

export interface ApiEnvironment extends RuntimeEnvironment {
  service: "api";
  authentication: {
    authorizedParties: string[];
    jwtKey?: string;
    secretKey?: string;
  };
  stripePlanMappings: Record<
    "launch" | "scale",
    {
      priceId: string;
      productId: string;
    }
  >;
}

export interface WorkerEnvironment extends RuntimeEnvironment {
  service: "worker";
}

export interface WebEnvironment {
  service: "web";
  environment: EnvironmentName;
  logLevel: LogLevel;
  apiUrl: URL;
  authentication: { publishableKey: string };
  telemetry: TelemetryConfiguration;
}

export interface FoundationEnvironment {
  api: ApiEnvironment;
  worker: WorkerEnvironment;
  web: WebEnvironment;
  telemetry: TelemetryConfiguration;
}

export function parseApiEnvironment(
  environment: NodeJS.ProcessEnv,
): ApiEnvironment;
export function parseWorkerEnvironment(
  environment: NodeJS.ProcessEnv,
): WorkerEnvironment;
export function parseWebEnvironment(
  environment: NodeJS.ProcessEnv,
): WebEnvironment;
export function parseFoundationEnvironment(
  environment: NodeJS.ProcessEnv,
): FoundationEnvironment;
