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

test.describe("Documentação", () => {
  test("o credenciamento cai sozinho quando o documento vence", async ({ page }) => {
    await page.goto(urlFor("team.docs-expired-drops-credentialing"));

    const credenciamento = page.getByRole("list", { name: "Credenciamento nas operadoras" });
    const unimed = credenciamento.getByRole("listitem").filter({ hasText: "Unimed" }).first();
    await expect(unimed).toContainText("Em credenciamento");
    await expect(unimed).toContainText("Registro no conselho — vencido");
    await expect(unimed).toContainText("A queda não teve autor");

    // A frase da queda não cabe onde nunca houve vínculo.
    const sulamerica = credenciamento.getByRole("listitem").filter({ hasText: "SulAmérica" }).first();
    await expect(sulamerica).toContainText("Não credenciado");
    await expect(sulamerica).not.toContainText("A queda não teve autor");
  });

  test("descredenciar à mão não se desfaz com a documentação completa", async ({ page }) => {
    await page.goto(urlFor("team.docs-decredentialed-stays-closed"));

    const porto = page
      .getByRole("list", { name: "Credenciamento nas operadoras" })
      .getByRole("listitem")
      .filter({ hasText: "Porto Seguro" })
      .first();
    await expect(porto).toContainText("Descredenciado");
    await expect(porto).not.toContainText("Falta");
    await expect(porto.getByRole("button", { name: "Reabrir credenciamento" })).toBeEnabled();
  });

  test("particular aparece e explica por que não recebe documento", async ({ page }) => {
    await page.goto(urlFor("team.docs-particular-has-no-credentialing"));
    await expect(
      page
        .getByRole("list", { name: "Credenciamento nas operadoras" })
        .getByRole("listitem")
        .filter({ hasText: "Particular" })
        .first(),
    ).toContainText("não há operadora para receber o documento");
  });

  test("o registro sem arquivo não passa por cumprido", async ({ page }) => {
    await page.goto(urlFor("team.docs-registered-without-file"));
    await expect(page.getByText("sem arquivo anexado").first()).toBeVisible();
    await expect(
      page.getByText("Nenhuma operadora aceita este registro enquanto o arquivo não for anexado."),
    ).toBeVisible();
  });

  test("a carga em ABA é a soma dos certificados", async ({ page }) => {
    await page.goto(urlFor("team.docs-aba-hours-from-certificates"));
    await expect(page.getByText(/240h de cursos em ABA/)).toBeVisible();
    await expect(page.getByText(/faixa Intermediária/)).toBeVisible();
  });

  test("a matriz ordena por severidade e a completude é do escopo aberto", async ({ page }) => {
    await page.goto(urlFor("team.docs-team-matrix"));

    const matriz = page.getByRole("region", { name: "Matriz de documentação" });
    const nomes = matriz.locator("tbody tr th");
    await expect(nomes.first()).toContainText("Rui Sampaio Neto");

    await expect(matriz.getByText("3 de 3 obrigatórios cumpridos").first()).toBeVisible();

    await page.getByRole("tab", { name: "Operadoras" }).click();
    await expect(matriz.getByText("Descredenciado")).toBeVisible();
  });

  test("quem atende não alcança a matriz", async ({ page }) => {
    await page.goto(urlFor("team.docs-no-access"));
    await expect(page.getByText("Você não tem acesso à documentação da equipe")).toBeVisible();
  });

  test("a unidade separa vigência futura, sem validade e vencido", async ({ page }) => {
    await page.goto(urlFor("structure.docs-unit-folder"));

    const tabela = page.locator("#documentos-da-unidade");
    await expect(tabela.getByText("Aguardando vigência")).toBeVisible();
    await expect(tabela.getByText("Sem validade").first()).toBeVisible();
    await expect(tabela.getByText("Vencido")).toBeVisible();
    await expect(tabela.getByText("Adicional")).toBeVisible();
  });

  test("um documento vencido segura o credenciamento da unidade inteira", async ({ page }) => {
    await page.goto(urlFor("structure.docs-unit-credentialing-blocked"));

    const unimed = page
      .getByRole("list", { name: "Credenciamento da unidade" })
      .getByRole("listitem")
      .filter({ hasText: "Unimed" })
      .first();
    await expect(unimed).toContainText("Em credenciamento");
    await expect(unimed).toContainText("AVCB — vencido");
  });

  test("a lacuna que nunca teve registro aparece com ação de anexar", async ({ page }) => {
    await page.goto(urlFor("structure.docs-unit-missing-slot"));

    const linha = page.locator("#documentos-da-unidade tr", { hasText: "Contrato de Locação" });
    await expect(linha).toContainText("Pendente");
    await expect(linha.getByRole("button", { name: "Anexar" })).toBeVisible();
  });

  test("a inativação recusa enquanto houver paciente sem destino", async ({ page }) => {
    await page.goto(urlFor("team.deactivation-needs-a-destination"));

    const confirmar = page.getByRole("button", { name: /Inativar/ });
    await expect(confirmar).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText(/Escolha a data de saída/).first()).toBeVisible();

    // A ordem das recusas é parte da regra: data, depois motivo, depois destino.
    await page.locator("#inativacao-data").fill("2026-08-28");
    await expect(page.getByText(/Selecione o motivo da inativação/).first()).toBeVisible();

    await page.locator("#inativacao-motivo-trigger").click();
    await page.getByRole("option", { name: "Pedido de demissão" }).click();
    await expect(page.getByText(/Defina quem assume 3 pacientes/).first()).toBeVisible();
    await expect(confirmar).toHaveAttribute("aria-disabled", "true");
  });

  test("quem já tem saída marcada não aparece como substituto", async ({ page }) => {
    await page.goto(urlFor("team.deactivation-needs-a-destination"));

    await page.locator("#destino-pac-helena-trigger").click();
    const opcoes = page.locator("#destino-pac-helena-options");
    await expect(opcoes).toContainText("Noel Ferrari");
    await expect(opcoes).not.toContainText("Vitória Camargo");
    await expect(opcoes).not.toContainText("Ismael Trindade");
  });

  test("editar a data não pede o motivo de novo", async ({ page }) => {
    await page.goto(urlFor("team.deactivation-edit-keeps-the-reason"));

    await expect(page.getByText(/Inativação marcada para/)).toBeVisible();
    await expect(page.getByText("O motivo não é pedido de novo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar inativação" })).toBeVisible();
  });
});
