import { expect } from "@playwright/test";
import { authenticatedTest } from "./clerk-fixtures";

authenticatedTest(
  "Organization locale localizes copy without changing API authorization or stored instants",
  async ({ authenticatedPage: page }) => {
    const settings = page.locator("#settings");
    const locale = settings.getByLabel(/Locale|Idioma/);
    const originalLocale = await locale.inputValue();
    const timeZone = await settings
      .getByLabel(/Time zone|Fuso horário/)
      .inputValue();
    const expectedInstant = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date("2026-09-24T20:00:00.000Z"));
    let authorization = "";
    let auditRequestUrl = "";

    await page.route(
      /\/v1\/organizations\/[^/]+\/audit-events(?:\?.*)?$/,
      async (route) => {
        authorization = route.request().headers().authorization ?? "";
        auditRequestUrl = route.request().url();
        const cursor = new URL(route.request().url()).searchParams.get(
          "cursor",
        );
        if (cursor) {
          await route.fulfill({ status: 503 });
          return;
        }
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                action: "organization.settings.update-requested",
                actor: { id: "user_locale", type: "user" },
                context: {},
                id: "018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1007",
                occurredAt: "2026-09-24T20:00:00.000Z",
                target: { id: "org_locale", type: "organization" },
              },
            ],
            pageInfo: { hasNextPage: true, nextCursor: "next-page" },
          }),
        });
      },
    );

    try {
      await locale.selectOption("pt-BR");
      await settings
        .getByRole("button", { name: /Save settings|Salvar configurações/ })
        .click();
      await expect(page.locator("#overview")).toHaveAttribute("lang", "pt-BR");
      await expect(
        page.getByRole("heading", { name: "Bom dia, Alex." }),
      ).toBeVisible();
      const organizationSwitcher = page.getByRole("combobox", {
        name: "Organização ativa",
      });
      await expect(organizationSwitcher).toBeVisible();
      await expect(
        organizationSwitcher.locator("xpath=ancestor::*[@lang][1]"),
      ).toHaveAttribute("lang", "pt-BR");
      await expect(page.getByTestId("contract-example-price")).toContainText(
        /R\$\s*49,00/,
      );

      const auditEvents = page.getByRole("region", {
        name: "Eventos de auditoria",
      });
      const occurredAt = auditEvents.locator("time");
      await expect(occurredAt).toHaveAttribute(
        "datetime",
        "2026-09-24T20:00:00.000Z",
      );
      await expect(occurredAt).toHaveText(expectedInstant);
      expect(authorization).toMatch(/^Bearer /);
      expect(new URL(auditRequestUrl).pathname).toMatch(
        /^\/v1\/organizations\/[^/]+\/audit-events$/,
      );

      await auditEvents
        .getByRole("button", { name: "Carregar mais eventos de auditoria" })
        .click();
      await expect(auditEvents).toContainText(
        "Eventos de auditoria indisponíveis",
      );
    } finally {
      if (originalLocale !== "pt-BR") {
        await page
          .locator("#settings")
          .getByLabel("Idioma")
          .selectOption(originalLocale);
        await page
          .locator("#settings")
          .getByRole("button", { name: "Salvar configurações" })
          .click();
        await expect(page.locator("#overview")).toHaveAttribute(
          "lang",
          originalLocale,
        );
      }
    }
  },
);
