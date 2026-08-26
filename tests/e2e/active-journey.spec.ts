import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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

/**
 * Esconde o coletor de feedback antes de interagir.
 *
 * Ele é ferramenta de desenvolvimento e flutua no canto inferior direito —
 * exatamente onde a ação principal do painel de detalhe da Supervisão fica numa
 * tela de 1280. No preview ele não existe (`import.meta.env.DEV` no `main.tsx`),
 * então esconder aqui não esconde nada do produto. Preferível a `force: true`,
 * que passaria por cima de um bloqueio de verdade sem avisar.
 */
async function semColetor(page: Page): Promise<void> {
  await page.addStyleTag({ content: "[data-fbc-root] { display: none !important; }" });
}

/**
 * A mesma situação com outro conjunto de dados, ou outra persona.
 *
 * A Supervisão da equipe é **uma** situação: as variações dela são dados, e o
 * alcance vem da persona. Trocar os dois pela URL é o que o seletor do rodapé
 * faz, e é assim que cada variação continua verificada sem virar uma entrada a
 * mais na navegação.
 */
function urlCom(scenarioId: string, troca: { fixture?: string; persona?: string }): string {
  const url = new URL(urlFor(scenarioId), "http://local");
  if (troca.fixture) url.searchParams.set("fixture", troca.fixture);
  if (troca.persona) url.searchParams.set("persona", troca.persona);
  return `${url.pathname}${url.search}`;
}

test.describe("Supervisão da equipe", () => {
  test("as três colunas se filtram nos dois sentidos", async ({ page }) => {
    await page.goto(urlFor("supervision.team"));
    await semColetor(page);

    const supervisores = page.getByRole("region", { name: "Supervisores" });
    const aplicadores = page.getByRole("region", { name: "Aplicadores" });
    const pacientes = page.getByRole("region", { name: "Pacientes" });

    // Sem nada selecionado, tudo aparece.
    await expect(supervisores.getByRole("button", { pressed: false })).toHaveCount(5);
    await expect(aplicadores.getByRole("button", { pressed: false })).toHaveCount(8);
    await expect(pacientes.getByRole("button", { pressed: false })).toHaveCount(12);

    // Do supervisor para baixo.
    await supervisores.getByRole("button", { name: /Rafael Andrade Nunes/ }).click();
    await expect(aplicadores.getByRole("button")).toHaveCount(3);
    await expect(pacientes.getByRole("button")).toHaveCount(6);
    await expect(page.getByText("Filtros:")).toBeVisible();

    // E do paciente para cima — o sentido que a tela portada não tem.
    await page.locator("#conteudo").getByRole("button", { name: "Limpar" }).click();
    await pacientes.getByRole("button", { name: /Lucas Almeida Ferreira/ }).click();
    await expect(supervisores.getByRole("button")).toHaveCount(2);
    await expect(aplicadores.getByRole("button")).toHaveCount(2);
    await expect(page.getByText("supervisão de Rafael Andrade Nunes")).toBeVisible();
    await expect(page.getByText("supervisão de Beatriz Lima Rocha")).toBeVisible();
  });

  test("os indicadores seguem o escopo do supervisor", async ({ page }) => {
    await page.goto(urlFor("supervision.team"));
    await semColetor(page);

    const atendimentos = page.locator("#indicador-atendimentos");
    const faltas = page.locator("#indicador-faltas");

    const aAssinar = page.locator("#indicador-a-assinar");
    await expect(atendimentos).toContainText("30");
    await expect(aAssinar).toContainText("7");

    await page
      .getByRole("region", { name: "Supervisores" })
      .getByRole("button", { name: /Rafael Andrade Nunes/ })
      .click();

    await expect(atendimentos).toContainText("15");
    await expect(faltas).toContainText("2");
    await expect(aAssinar).toContainText("3");
  });

  test("o lote mostra o registro antes de pedir a assinatura", async ({ page }) => {
    await page.goto(urlFor("supervision.team"));
    await semColetor(page);

    await page.locator("#conteudo").getByRole("button", { name: "Revisar e assinar" }).first().click();

    const dialogo = page.locator("#lote-de-assinaturas");
    await expect(dialogo.getByText("Programas trabalhados")).toBeVisible();
    await expect(dialogo.getByText("Observações do aplicador")).toBeVisible();
    // Tentativas corretas, e não só o nome do programa: é o que a assinatura
    // afirma ter sido conferido.
    await expect(dialogo.getByText(/\d+\/\d+ tentativas corretas/).first()).toBeVisible();
    // Check-in e check-out ficam à vista: sem eles a assinatura afirma que o
    // atendimento aconteceu sem dizer quando começou.
    await expect(dialogo.getByText(/Check-in \d{2}:\d{2}/)).toBeVisible();
  });

  test("assinar avança e derruba a fila; o resumo conta o que foi assinado", async ({ page }) => {
    await page.goto(urlFor("supervision.team"));
    await semColetor(page);

    await page
      .getByRole("region", { name: "Pacientes" })
      .getByRole("button", { name: /Lucas Almeida Ferreira/ })
      .click();
    await page.locator("#conteudo").getByRole("button", { name: "Revisar e assinar" }).first().click();

    const dialogo = page.locator("#lote-de-assinaturas");
    await expect(dialogo.getByText("1 de 2")).toBeVisible();

    await dialogo.getByRole("button", { name: "Assinar e avançar" }).click();
    await expect(dialogo.getByText("2 de 2")).toBeVisible();
    await expect(page.locator("#indicador-a-assinar")).toContainText("6");

    // A última assinatura fecha o painel e abre o resumo, que é `modal/1`
    // centrado: o fim da fila não continua a leitura, ele fecha o assunto.
    await dialogo.getByRole("button", { name: "Assinar e avançar" }).click();
    const resumo = page.locator("#lote-concluido");
    await expect(resumo.getByText("2 atendimentos assinados")).toBeVisible();
    await expect(dialogo).toHaveCount(0);

    await resumo.getByRole("button", { name: "Concluir" }).click();
    // A região viva nasce vazia e só fala depois da ação.
    await expect(page.locator('[role="status"]')).toHaveText("2 atendimentos assinados.");
  });

  test("deixar na fila não assina, e o resumo diz quantos ficaram", async ({ page }) => {
    await page.goto(urlFor("supervision.team"));
    await semColetor(page);

    await page
      .getByRole("region", { name: "Pacientes" })
      .getByRole("button", { name: /Lucas Almeida Ferreira/ })
      .click();
    await page.locator("#conteudo").getByRole("button", { name: "Revisar e assinar" }).first().click();

    const dialogo = page.locator("#lote-de-assinaturas");
    await dialogo.getByRole("button", { name: "Pular" }).click();
    await dialogo.getByRole("button", { name: "Pular" }).click();

    const resumo = page.locator("#lote-concluido");
    await expect(resumo.getByText("Nenhum atendimento assinado")).toBeVisible();
    await expect(resumo.getByText(/ficaram pendentes e seguem na sua fila/)).toBeVisible();

    // E a região viva continua calada: nada mudou na tela, então não há
    // resultado a anunciar — um aviso verde de confirmação sobre "nada foi
    // assinado" diria o contrário do que aconteceu.
    await resumo.getByRole("button", { name: "Concluir" }).click();
    await expect(page.locator('[role="status"]')).toHaveText("");
    // Nada saiu da fila: pular não é recusar, e não é assinar.
    await expect(page.locator("#indicador-a-assinar")).toContainText("7");
  });

  /**
   * Assinado e deixado na fila são conjuntos disjuntos.
   *
   * Sem isso o resumo mente: dois cliques dentro do mesmo lote de atualizações do
   * React punham o mesmo atendimento nos dois, e a fila de sete fechava com "6
   * assinados · 2 na fila". O que este teste prende é a soma.
   */
  test("o resumo soma exatamente o tamanho da fila", async ({ page }) => {
    await page.goto(urlFor("supervision.team"));
    await semColetor(page);

    await page
      .getByRole("region", { name: "Pacientes" })
      .getByRole("button", { name: /Lucas Almeida Ferreira/ })
      .click();
    await page.locator("#conteudo").getByRole("button", { name: "Revisar e assinar" }).first().click();

    const dialogo = page.locator("#lote-de-assinaturas");
    await dialogo.getByRole("button", { name: "Assinar e avançar" }).click();
    await dialogo.getByRole("button", { name: "Pular" }).click();

    const resumo = page.locator("#lote-concluido");
    await expect(resumo.getByText("1 atendimento assinado")).toBeVisible();
    await expect(resumo.getByText(/1 atendimento ficou pendente e segue na sua fila/)).toBeVisible();
    // Um assinado mais um na fila é a fila inteira: nenhum contado duas vezes.
    await resumo.getByRole("button", { name: "Concluir" }).click();
    await expect(page.locator("#indicador-a-assinar")).toContainText("6");
  });

  test("o diálogo do lote não tem violação bloqueante", async ({ page }) => {
    await page.goto(urlFor("supervision.team"));
    await semColetor(page);
    await page.locator("#conteudo").getByRole("button", { name: "Revisar e assinar" }).first().click();
    // O painel é o `-container`: o `<div>` do id é a moldura de posicionamento,
    // sem caixa própria, e `waitFor` sobre ele espera para sempre.
    await page.locator("#lote-de-assinaturas-container").waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude(".espelho-do-sistema")
      .analyze();

    const blocking = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(blocking.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  });

  test("quem supervisiona não escolhe supervisor, e limpar não abre a clínica", async ({
    page,
  }) => {
    await page.goto(urlCom("supervision.team", { persona: "supervisor" }));
    await semColetor(page);

    await expect(page.getByRole("region", { name: "Supervisores" })).toHaveCount(0);
    // O painel de detalhe é o que diz de quem é a carteira — não um aviso.
    await expect(page.getByText("Rafael Andrade Nunes")).toBeVisible();

    const aplicadores = page.getByRole("region", { name: "Aplicadores" });
    await expect(aplicadores.getByRole("button")).toHaveCount(3);

    await aplicadores.getByRole("button", { name: /Marina Costa/ }).click();
    await page.locator("#conteudo").getByRole("button", { name: "Limpar" }).click();
    // Volta para os três vínculos dele, e não para os oito da clínica.
    await expect(aplicadores.getByRole("button")).toHaveCount(3);
  });

  /**
   * O horário desta tela só aparece depois de escolher um paciente, então a
   * varredura de fuso — que mede a primeira tela — não o alcança. Aqui ele é
   * medido com o clique, nos três fusos, e a leitura tem de ser a mesma: horário
   * de atendimento é do lugar onde o atendimento acontece.
   */
  test("o horário do atendimento é o da clínica em qualquer fuso", async ({ browser }) => {
    const leituras: string[] = [];

    for (const fuso of ["America/Sao_Paulo", "Europe/Lisbon", "Asia/Tokyo"]) {
      const contexto = await browser.newContext({ timezoneId: fuso });
      const page = await contexto.newPage();
      await page.goto(urlFor("supervision.team"));
      await semColetor(page);
      await page
        .getByRole("region", { name: "Pacientes" })
        .getByRole("button", { name: /Lucas Almeida Ferreira/ })
        .click();

      const atendimentos = page.getByRole("region", { name: "Pacientes" });
      await atendimentos.waitFor();
      const texto = await page.locator("#conteudo").innerText();
      const horarios = (texto.match(/\d{2}:\d{2}/g) ?? []).join(",");
      // Sem isto o teste passaria de graça se a tela deixasse de mostrar horário.
      expect(horarios, `nenhum horário na tela em ${fuso}`).not.toBe("");
      leituras.push(horarios);
      await contexto.close();
    }

    expect(new Set(leituras).size, `leituras divergentes: ${leituras.join(" | ")}`).toBe(1);
  });

  /**
   * A persona escolhida decide quantas colunas existem.
   *
   * Uma permissão por coluna, e nenhuma pergunta pelo papel: é o que faz o
   * supervisor que também é terapeuta funcionar, e é o que dá à recepção a
   * pergunta dela — "quem atende esta criança?" — sem lhe dar a carteira de
   * supervisão de ninguém.
   */
  test("o alcance de cada coluna segue a persona", async ({ page }) => {
    const supervisores = page.getByRole("region", { name: "Supervisores" });
    const aplicadores = page.getByRole("region", { name: "Aplicadores" });
    const pacientes = page.getByRole("region", { name: "Pacientes" });

    for (const papel of ["admin", "clinic_admin", "coordinator"]) {
      await page.goto(urlCom("supervision.team", { persona: papel }));
      await expect(supervisores, papel).toBeVisible();
      await expect(aplicadores, papel).toBeVisible();
      await expect(pacientes, papel).toBeVisible();
    }

    // Recepção: duas colunas, e nenhuma trava — ela vê a clínica inteira.
    await page.goto(urlCom("supervision.team", { persona: "attendant" }));
    await expect(supervisores).toHaveCount(0);
    await expect(aplicadores.getByRole("button")).toHaveCount(8);
    await expect(pacientes.getByRole("button")).toHaveCount(12);

    // People alcança profissionais e não alcança pacientes.
    await page.goto(urlCom("supervision.team", { persona: "people" }));
    await expect(page.getByText("Esta tela cruza três listas, e você alcança uma")).toBeVisible();
    await expect(page.getByText(/está em Profissionais/)).toBeVisible();

    // Quem é supervisionado alcança pacientes, e a assinatura dele é pedida no
    // atendimento — não aqui.
    for (const papel of ["operation", "applicator", "therapeutic_companion", "specialist"]) {
      await page.goto(urlCom("supervision.team", { persona: papel }));
      await expect(page.getByText(/não há de quem falar/), papel).toBeVisible();
    }

    // Com vínculo, quem supervisiona vê a própria carteira — sem coluna de
    // supervisores e com as outras duas filtradas.
    await page.goto(urlCom("supervision.team", { persona: "supervisor" }));
    await expect(supervisores).toHaveCount(0);
    await expect(aplicadores.getByRole("button")).toHaveCount(3);
    await expect(pacientes.getByRole("button")).toHaveCount(6);

    // Sem vínculo, o mesmo papel não abre: é o vínculo que abre, não o cargo.
    await page.goto(
      urlCom("supervision.team", {
        persona: "supervisor",
        fixture: "supervision-team-new-supervisor",
      }),
    );
    await expect(page.getByText(/quando o primeiro vínculo existir/)).toBeVisible();
  });

  test("a fila vazia não esconde o trabalho que sobrou", async ({ page }) => {
    await page.goto(urlCom("supervision.team", { fixture: "supervision-team-signed" }));
    await semColetor(page);

    await expect(page.locator("#indicador-a-assinar")).toContainText("0");
    await expect(page.getByText("Nenhuma assinatura pendente neste escopo.")).toBeVisible();
    // Sem fila, o filtro não existe: filtrar por zero devolve três colunas vazias.
    await expect(
      page.getByRole("button", { name: "Só o que aguarda assinatura" }),
    ).toHaveCount(0);

    // Sem pendência de assinatura ≠ sem trabalho.
    await page
      .getByRole("region", { name: "Aplicadores" })
      .getByRole("button", { name: /Paula Antunes/ })
      .click();
    await expect(page.getByText("Nunca supervisionado")).toBeVisible();
  });
});

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
