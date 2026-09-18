import { sanitizeForLog } from "./redaction.mjs";

const levelPriority = { debug: 10, info: 20, warn: 30, error: 40 };

export class JsonLogger {
  constructor(options) {
    this.options = options;
    this.writeLine =
      options.write ?? ((line) => process.stdout.write(`${line}\n`));
  }

  log(message, ...parameters) {
    this.emit("info", message, parameters);
  }
  error(message, ...parameters) {
    this.emit("error", message, parameters);
  }
  warn(message, ...parameters) {
    this.emit("warn", message, parameters);
  }
  debug(message, ...parameters) {
    this.emit("debug", message, parameters);
  }
  verbose(message, ...parameters) {
    this.emit("debug", message, parameters);
  }
  fatal(message, ...parameters) {
    this.emit("error", message, parameters);
  }

  requestCompleted(fields) {
    const outcome =
      fields.statusCode >= 500
        ? "server_error"
        : fields.statusCode >= 400
          ? "client_error"
          : "success";
    this.write("info", { event: "request.completed", ...fields, outcome });
  }

  emit(level, message, parameters) {
    const lastParameter = parameters.at(-1);
    const context =
      typeof lastParameter === "string" &&
      !lastParameter.includes("\n    at ") &&
      !lastParameter.startsWith("Error:")
        ? lastParameter
        : undefined;
    this.write(level, { message, ...(context ? { context } : {}) });
  }

  write(level, attributes) {
    if (levelPriority[level] < levelPriority[this.options.level]) return;
    this.writeLine(
      JSON.stringify(
        sanitizeForLog({
          timestamp: new Date().toISOString(),
          level,
          service: this.options.service,
          environment: this.options.environment,
          ...attributes,
        }),
      ),
    );
  }
}
