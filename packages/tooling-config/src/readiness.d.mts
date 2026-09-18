export type DependencyStatus =
  | "up"
  | "down"
  | "configured"
  | "disabled"
  | "misconfigured";

export interface ReadinessCheck {
  name: string;
  critical: boolean;
  probe?: () => Promise<unknown>;
  status?: "configured" | "disabled" | "misconfigured";
}

export interface DependencyReadiness {
  name: string;
  critical: boolean;
  status: DependencyStatus;
}

export interface ReadinessReport<Service extends string> {
  service: Service;
  status: "ready" | "degraded" | "unready";
  dependencies: DependencyReadiness[];
}

export class ReadinessService<Service extends string> {
  constructor(service: Service);
  configure(checks: ReadinessCheck[]): void;
  inspect(): Promise<ReadinessReport<Service>>;
}

export function createPostgresProbe(
  databaseUrl: URL,
  timeoutMilliseconds?: number,
): () => Promise<void>;
export function createRedisProbe(
  redisUrl: URL,
  timeoutMilliseconds?: number,
): () => Promise<void>;
