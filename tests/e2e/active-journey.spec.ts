import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { activeScenarios as scenarios } from "./active-scenarios.js";

function urlFor(scenarioId: string): string {
  const scenario = scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`Cenário ativo inexistente no teste: ${scenarioId}`);
  return pathFor(scenario, { chrome: false });
}

function chromeUrlFor(scenarioId: string): string {
  const scenario = scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`Cenário ativo inexistente no teste: ${scenarioId}`);
  return pathFor(scenario);
}

for (const scenario of scenarios) {
  test(`abre "${scenario.title}" direto pela URL`, async ({ page }) => {
    await page.goto(urlFor(scenario.id));
    await expect(page.locator("#conteudo")).toBeVisible();
  });

  test(`axe sem violação bloqueante em "${scenario.title}"`, async ({ page }) => {
    await page.goto(urlFor(scenario.id));
    await page.locator("#conteudo").waitFor();
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude(".espelho-do-sistema")
      .analyze();

    const blocking = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );

    expect(
      blocking.map((violation) => `${violation.id}: ${violation.help}`),
      `Violações bloqueantes em ${scenario.id}`,
    ).toEqual([]);
  });
}

test.describe("Listas gerenciais", () => {
  test("o handoff inclui o componente usado pela proposta", async ({ page }) => {
    await page.goto(
      `${chromeUrlFor("management.grouped-navigation")}&handoff=1&allowScenario=management.grouped-navigation&allowComponent=core.lazy-tabs`,
    );
    await page.getByRole("tab", { name: "Componentes" }).click();

    const sidebar = page.getByRole("navigation", { name: "Cenários do produto" });
    await expect(sidebar.getByRole("button", { name: /lazy_tabs/ })).toBeVisible();
    await expect(sidebar.getByText("O produto ainda não registrou componentes.")).toHaveCount(0);
  });

  test("as onze listas ficam organizadas em quatro grupos e Documentação não aparece", async ({ page }) => {
    await page.goto(urlFor("management.grouped-navigation"));

    const navigation = page.getByRole("navigation", { name: "Listas gerenciais" });
    const groups = navigation.locator("[data-management-group]");
    await expect(groups).toHaveText(["Operação", "Agenda", "Assistencial", "Relatórios"]);
    await expect(navigation.getByText("Documentação", { exact: true })).toHaveCount(0);
    await expect(navigation.getByRole("button", { name: "Assistencial" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await navigation.getByRole("button", { name: "Operação" }).click();
    await expect(
      page.getByRole("menu", { name: "Operação" }).getByRole("menuitemradio"),
    ).toHaveText(["Cadastro de Pacientes", "Cadastro de Profissionais", "Autorizações"]);

    await navigation.getByRole("button", { name: "Agenda" }).click();
    await expect(
      page.getByRole("menu", { name: "Agenda" }).getByRole("menuitemradio"),
    ).toHaveText(["Mapa de Horas", "Faltas Profissionais"]);

    await navigation.getByRole("button", { name: "Assistencial" }).click();
    await expect(
      page.getByRole("menu", { name: "Assistencial" }).getByRole("menuitemradio"),
    ).toHaveText([
      "Supervisores",
      "Aplicadores",
      "Responsáveis Clínicos",
      "Planos terapêuticos",
    ]);

    await navigation.getByRole("button", { name: "Relatórios" }).click();
    await expect(
      page.getByRole("menu", { name: "Relatórios" }).getByRole("menuitemradio"),
    ).toHaveText(["Profissionais por Especialidade", "Controle de Relatórios"]);

    await navigation.getByRole("button", { name: "Operação" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(navigation.getByRole("button", { name: "Agenda" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("menu", { name: "Agenda" }).getByRole("menuitemradio").first(),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(navigation.getByRole("button", { name: "Agenda" })).toBeFocused();
  });

  test("os menus agrupados mantêm relações ARIA válidas quando abertos", async ({ page }) => {
    await page.goto(urlFor("management.grouped-navigation"));
    await page.getByRole("button", { name: "Assistencial" }).click();
    const results = await new AxeBuilder({ page })
      .include('nav[aria-label="Listas gerenciais"]')
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
