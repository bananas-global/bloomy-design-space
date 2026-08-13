import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { activeScenarios as scenarios } from "./active-scenarios.js";

/**
 * A navegação automatizada cobre somente o trabalho ativo. Referências
 * `ported` continuam consultáveis no Design Space, mas não são validadas nem
 * tratadas como compromisso de implementação.
 */
test("a navegação abre todas as situações ativas sem apagar a tela", async ({ page }) => {
  expect(scenarios.length, "o catálogo precisa ter ao menos um cenário ativo").toBeGreaterThan(0);
  await page.goto(pathFor(scenarios[0]!));

  const itens = page.locator("button.ds-scenario");
  await expect(itens).toHaveCount(scenarios.length);

  for (let i = 0; i < scenarios.length; i += 1) {
    await itens.nth(i).click();
    await expect(page.locator("#conteudo")).toBeVisible();
    await expect(
      page
        .locator('[role="alert"]')
        .filter({ hasText: /não conseguiu montar|dados de outra situação/ }),
    ).toHaveCount(0);
  }
});

test("a navegação começa recolhida e o botão do cabeçalho a expande", async ({ page }) => {
  expect(scenarios.length, "o catálogo precisa ter ao menos um cenário ativo").toBeGreaterThan(0);
  await page.goto(pathFor(scenarios[0]!));

  const drawer = page.locator(".bloomy-drawer");
  const botao = page.getByRole("button", { name: /a navegação/ });

  await expect(drawer).toHaveCSS("width", "72px");
  await expect(botao).toHaveAttribute("aria-expanded", "false");

  await botao.click();
  await expect(drawer).toHaveCSS("width", "256px");
  await expect(botao).toHaveAttribute("aria-expanded", "true");

  await botao.click();
  await expect(drawer).toHaveCSS("width", "72px");
});
