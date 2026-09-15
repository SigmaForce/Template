export const CORRELATION_ID_HEADER = "x-correlation-id";
const SAFE_CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function resolveCorrelationId(candidate) {
  return candidate && SAFE_CORRELATION_ID.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

export function correlationIdMiddleware(request, response, next) {
  const correlationId = resolveCorrelationId(
    request.get(CORRELATION_ID_HEADER),
  );
  request.headers[CORRELATION_ID_HEADER] = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}

export function getResponseCorrelationId(response) {
  const correlationId = response.getHeader(CORRELATION_ID_HEADER);
  return typeof correlationId === "string"
    ? correlationId
    : resolveCorrelationId(null);
}

export function createRequestLoggingMiddleware(logger) {
  return (request, response, next) => {
    const startedAt = performance.now();
    response.once("finish", () => {
      logger.requestCompleted({
        correlationId: request.get(CORRELATION_ID_HEADER) ?? "unknown",
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
    });
    next();
  };
}
