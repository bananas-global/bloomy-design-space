import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { fixtures, scenarios } from "../../src/app/catalog.js";

const portedScenarios = scenarios.filter((scenario) => scenario.status === "ported");
const activeScenarios = scenarios.filter((scenario) => scenario.status !== "ported");

/**
 * Navegar **dentro** do app, sem recarregar.
 *
 * Esta varredura existe porque as outras oitocentas e setenta e quatro não
 * existiam. Todas elas fazem `page.goto()` — carga limpa, rota e cenário sempre
 * coerentes — e nenhuma clica de uma situação para outra. Então uma classe
 * inteira de defeito ficou invisível: **o que o app carrega de uma tela para a
 * seguinte**.
 *
 * O Bruno achou em dois minutos o que a suíte não achou em uma noite, porque ele
 * usou o produto e ela não. Metade das telas ficava branca ao navegar, sem nem o
 * chrome do Design Space, e voltava com recarga — o sintoma exato de um estado
 * que atravessa a navegação e de um render que derruba a árvore.
 *
 * A lição não é “faltou um teste”. É que **cobrir os 254 cenários de um jeito só
 * é largura, não confiança**, e eu confundi as duas coisas a noite inteira.
 */
test.setTimeout(180_000);

test("clicar por todas as situações não apaga a tela", async ({ page }) => {
  // Sem override: o padrão do motor **mostra** a navegação e os controles, que
  // são justamente o que este teste exercita. As outras varreduras passam
  // `chrome: false`, que os esconde — correto lá, porque elas medem a tela do
  // produto, e foi o que me fez inverter a leitura na primeira tentativa.
  await page.goto(pathFor(scenarios[0]!, { view: "ported" }));

  const itens = page.locator("button.ds-scenario");
  await expect(itens.first()).toBeVisible();
  const total = await itens.count();

  // A varredura ativa explicitamente as referências portadas. No uso normal,
  // elas ficam fora do trabalho ativo; aqui precisamos alcançar o catálogo
  // inteiro para continuar protegendo a navegação entre telas.
  expect(total).toBe(portedScenarios.length);

  const quebradas: string[] = [];

  for (let i = 0; i < total; i += 1) {
    const item = itens.nth(i);
    const titulo = (await item.locator(".ds-scenario__title").innerText()).trim();
    await item.click();

    // 1. O chrome sobreviveu. Era isto que sumia: a árvore inteira caía junto
    //    com a tela, e sobrava página branca.
    const chromeVivo = await page.locator("button.ds-scenario").first().isVisible();
    // 2. A região de conteúdo existe.
    const conteudoVivo = await page.locator("#conteudo").isVisible();
    // 3. E a tela montou — a blindagem não precisou entrar.
    const blindagem = await page
      .locator('[role="alert"]')
      .filter({ hasText: /não conseguiu montar|dados de outra situação/ })
      .count();

    if (!chromeVivo || !conteudoVivo || blindagem > 0) quebradas.push(titulo);
  }

  expect(quebradas, "Situações que quebraram ao serem abertas pela navegação").toEqual([]);
});

test("referências portadas vivem numa visão separada e reproduzível", async ({ page }) => {
  await page.goto("/");
  const sidebar = page.getByRole("navigation", { name: "Cenários do produto" });

  await expect(page.locator("button.ds-scenario")).toHaveCount(activeScenarios.length);
  await expect(page.locator(".ds-module")).toHaveCount(1);

  await sidebar.getByRole("button", { name: "Ver 285 referências portadas" }).click();

  await expect(page).toHaveURL(/view=ported/);
  await expect(sidebar.getByRole("heading", { name: "Referências portadas · 285" })).toBeVisible();
  await expect(page.locator("button.ds-scenario")).toHaveCount(portedScenarios.length);

  await page.reload();
  await expect(sidebar.getByRole("heading", { name: "Referências portadas · 285" })).toBeVisible();
  await expect(page.locator("button.ds-scenario")).toHaveCount(portedScenarios.length);

  await sidebar.getByRole("button", { name: "Voltar ao trabalho ativo" }).click();
  await expect(page).not.toHaveURL(/view=ported/);
  await expect(page.locator("button.ds-scenario")).toHaveCount(activeScenarios.length);
  await expect(page.locator(".ds-module")).toHaveCount(1);
});

/**
 * A URL aceita qualquer fixture do catálogo em qualquer rota.
 *
 * Não dá para impedir a combinação — e nem deveria: escolher dados de propósito
 * é metade do valor do Design Space. O que precisa valer é que a combinação
 * errada **explique**, em vez de apagar tudo.
 */
test("dados de outra situação na URL explicam, e não apagam a tela", async ({ page }) => {
  const cenario = scenarios.find((s) => s.id === "agenda.overdue-as-coordinator")!;
  const outra = fixtures.find((f) => f.id === "agenda-day")!;

  // Desde o motor 0.3.0, fixture é escopo do cenário na lateral e o override
  // explícito vive na URL. O contrato continua permitindo combinações
  // deliberadas sem manter um seletor global no chrome.
  await page.goto(pathFor(cenario, { fixture: outra.id }));

  await expect(page.getByText("Esta tela está recebendo os dados de outra situação")).toBeVisible();
  await expect(page.getByText(`“${outra.label}”`)).toBeVisible();
  // O chrome tem que continuar de pé: é ele que dá o caminho de volta.
  await expect(page.locator("button.ds-scenario").first()).toBeVisible();
  await expect(page.locator("#conteudo")).toBeVisible();
});

test("voltar para os dados declarados recupera a tela", async ({ page }) => {
  const cenario = scenarios.find((s) => s.id === "agenda.overdue-as-coordinator")!;

  await page.goto(pathFor(cenario, { fixture: "agenda-day" }));
  await expect(page.getByText("Esta tela está recebendo os dados de outra situação")).toBeVisible();

  // O deep link sem override volta a herdar a fixture declarada no cenário.
  await page.goto(pathFor(cenario));
  await expect(
    page.getByText("Esta tela está recebendo os dados de outra situação"),
  ).toHaveCount(0);
  await expect(page.locator("#conteudo")).toBeVisible();
});

/**
 * O drawer nasce recolhido, como no sistema.
 *
 * `BackofficeComponents.drawer/1` traz `data-collapsed="true"` no atributo
 * inicial: 72px no desktop, só ícone. Quem abre o Bloomy pela primeira vez vê o
 * menu estreito, e este teste impede que a especificação passe a descrever um
 * produto mais confortável do que o que existe.
 */
test("a navegação começa recolhida e o botão do cabeçalho a expande", async ({ page }) => {
  await page.goto(pathFor(scenarios[0]!));

  const drawer = page.locator(".bloomy-drawer");
  const botao = page.getByRole("button", { name: /a navegação/ });

  await expect(drawer).toHaveCSS("width", "72px");
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  // Recolhido o rótulo sai da tela, e o nome continua alcançável por quem usa
  // leitor de tela — é o que o tooltip do sistema faz.
  await expect(drawer.getByRole("link", { name: "Agendamentos" })).toBeVisible();

  await botao.click();

  await expect(drawer).toHaveCSS("width", "256px");
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await expect(drawer.getByText("Agendamentos", { exact: true })).toBeVisible();

  await botao.click();
  await expect(drawer).toHaveCSS("width", "72px");
});
