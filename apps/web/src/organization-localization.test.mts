import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCivilDate,
  formatInstant,
  formatMoney,
  localizeCapability,
  localizeProductState,
  resolveSupportedLocale,
} from "./organization-localization.ts";

test("selects a declared locale and safely falls back to English", () => {
  assert.equal(resolveSupportedLocale("pt-BR"), "pt-BR");
  assert.equal(resolveSupportedLocale("es-AR"), "en-US");
  assert.equal(resolveSupportedLocale(undefined), "en-US");
  assert.equal(localizeProductState("pending", "pt-BR"), "pendente");
  assert.equal(
    localizeCapability(
      "organization-settings",
      "Organization Settings",
      "pt-BR",
    ),
    "Configurações da organização",
  );
});

test("localizes presentation without changing money or temporal values", () => {
  const money = { amountMinor: "4900", currency: "BRL" };
  const instant = "2026-09-24T20:00:00.000Z";

  assert.match(formatMoney(money, "pt-BR"), /^R\$\s49,00$/);
  assert.match(
    formatMoney(
      { amountMinor: "900719925474099301", currency: "BRL" },
      "pt-BR",
    ),
    /^R\$\s9\.007\.199\.254\.740\.993,01$/,
  );
  assert.match(
    formatMoney({ amountMinor: "4900", currency: "JPY" }, "pt-BR"),
    /4\.900$/,
  );
  assert.match(
    formatMoney({ amountMinor: "-1", currency: "BRL" }, "pt-BR"),
    /^-R\$\s0,01$/,
  );
  assert.match(formatCivilDate("2026-09-15", "pt-BR"), /15 de setembro/);
  assert.match(
    formatInstant(instant, "pt-BR", "America/Cuiaba"),
    /24 de set\. de 2026.*16:00/,
  );
  assert.deepEqual(money, { amountMinor: "4900", currency: "BRL" });
  assert.equal(instant, "2026-09-24T20:00:00.000Z");
});
