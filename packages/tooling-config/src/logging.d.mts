export type LogLevel = "debug" | "info" | "warn" | "error";

export interface JsonLoggerOptions {
  service: "api" | "worker";
  environment: "development" | "test" | "staging" | "production";
  level: LogLevel;
  write?: (line: string) => void;
}

export interface RequestCompletedFields {
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

export class JsonLogger {
  constructor(options: JsonLoggerOptions);
  log(message: unknown, ...parameters: unknown[]): void;
  error(message: unknown, ...parameters: unknown[]): void;
  warn(message: unknown, ...parameters: unknown[]): void;
  debug(message: unknown, ...parameters: unknown[]): void;
  verbose(message: unknown, ...parameters: unknown[]): void;
  fatal(message: unknown, ...parameters: unknown[]): void;
  requestCompleted(fields: RequestCompletedFields): void;
}
