export const supportedLocales = ["en-US", "pt-BR"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export function resolveSupportedLocale(locale: unknown): SupportedLocale {
  return locale === "pt-BR" ? "pt-BR" : "en-US";
}

export function localize(
  locale: SupportedLocale,
  english: string,
  portuguese: string,
) {
  return locale === "pt-BR" ? portuguese : english;
}

const portugueseProductStates: Record<string, string> = {
  accepted: "aceito",
  active: "ativo",
  admin: "administrador",
  canceled: "cancelado",
  expired: "expirado",
  incomplete: "incompleto",
  incomplete_expired: "incompleto expirado",
  member: "membro",
  owner: "proprietário",
  past_due: "em atraso",
  paused: "pausado",
  pending: "pendente",
  removed: "removido",
  revoked: "revogado",
  suspended: "suspenso",
  trialing: "em avaliação",
  unpaid: "não pago",
};

export function localizeProductState(value: string, locale: SupportedLocale) {
  return locale === "pt-BR" ? (portugueseProductStates[value] ?? value) : value;
}

const portugueseCapabilities: Record<string, string> = {
  billing: "Cobrança",
  "organization-memberships": "Vínculos da organização",
  "organization-settings": "Configurações da organização",
};

export function localizeCapability(
  id: string,
  fallbackName: string,
  locale: SupportedLocale,
) {
  return locale === "pt-BR"
    ? (portugueseCapabilities[id] ?? fallbackName)
    : fallbackName;
}

export function formatMoney(
  money: { amountMinor: string; currency: string },
  locale: SupportedLocale,
) {
  const currencyFormatter = new Intl.NumberFormat(locale, {
    currency: money.currency,
    style: "currency",
  });
  const fractionDigits =
    currencyFormatter.resolvedOptions().maximumFractionDigits ?? 0;
  const negative = money.amountMinor.startsWith("-");
  const digits = (
    negative ? money.amountMinor.slice(1) : money.amountMinor
  ).padStart(fractionDigits + 1, "0");
  const major = fractionDigits
    ? `${negative ? "-" : ""}${digits.slice(0, -fractionDigits)}.${digits.slice(-fractionDigits)}`
    : `${negative ? "-" : ""}${digits}`;

  // ECMA-402 accepts exact decimal strings; TypeScript's lib type is narrower.
  return currencyFormatter.format(major as unknown as number);
}

export function formatCivilDate(date: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function formatInstant(
  instant: string,
  locale: SupportedLocale,
  timeZone: string,
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(instant));
}
