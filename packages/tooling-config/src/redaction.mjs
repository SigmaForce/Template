const sensitiveKeys = /^(authorization|cookie|setcookie|token|accesstoken|refreshtoken|password|secret|signature|stripesignature|svixsignature|apikey|key|dsn|payload|body|email|phone|phonenumber|firstname|lastname|fullname|address|taxid|cpf|cnpj)$/i;

function sanitizeText(value) {
  return value
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED]")
    .replace(/:\/\/[^/@\s]+@/g, "://[REDACTED]@")
    .replace(
      /([?&](?:token|key|signature|password|secret)=)[^&\s]+/gi,
      "$1[REDACTED]",
    );
}

function normalizeKey(value) {
  return value.replaceAll(/[-_.]/g, "");
}

export function sanitizeForLog(value, seen = new WeakSet()) {
  if (typeof value === "string") return sanitizeText(value);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return { name: value.name, message: sanitizeText(value.message) };
  }
  if (value instanceof URL) return sanitizeText(value.toString());
  if (seen.has(value)) return "[CIRCULAR]";

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeys.test(normalizeKey(key))
        ? "[REDACTED]"
        : sanitizeForLog(nestedValue, seen),
    ]),
  );
}
