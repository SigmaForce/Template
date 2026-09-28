import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCivilDate,
  formatInstant,
  formatMoney,
  localizeProductState,
  resolveSupportedLocale,
} from "./organization-localization.ts";

test("selects a declared locale and safely falls back to English", () => {
  assert.equal(resolveSupportedLocale("pt-BR"), "pt-BR");
  assert.equal(resolveSupportedLocale("es-AR"), "en-US");
  assert.equal(resolveSupportedLocale(undefined), "en-US");
  assert.equal(localizeProductState("pending", "pt-BR"), "pendente");
});

test("localizes presentation without changing money or temporal values", () => {
  const money = { amountMinor: "4900", currency: "BRL" };
  const instant = "2026-09-24T20:00:00.000Z";

  assert.match(formatMoney(money, "pt-BR"), /^R\$\s49,00$/);
  assert.match(formatCivilDate("2026-09-15", "pt-BR"), /15 de setembro/);
  assert.match(
    formatInstant(instant, "pt-BR", "America/Cuiaba"),
    /24 de set\. de 2026.*16:00/,
  );
  assert.deepEqual(money, { amountMinor: "4900", currency: "BRL" });
  assert.equal(instant, "2026-09-24T20:00:00.000Z");
});
