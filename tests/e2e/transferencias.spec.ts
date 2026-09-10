import { expect, test, type Page } from "@playwright/test";

/**
 * Comportamento da Central de Transferências.
 *
 * O que o cálculo faz está fixado em `tests/rules.test.ts`, que roda em
 * milissegundos e sem navegador. Aqui fica o que só a tela responde: que o
 * veredito chega à linha certa, que a rodada devolve o resto à fila, que o
 * horário lotado abre, e que o botão bloqueado continua alcançável.
 */
const TELA = "/transfers?scenario=transfers.queue&chrome=0&panel=0";

/** Os três mapas que a inativação de Juliana Reis deixou. */
const DE_JULIANA = ["map-sofia-psi", "map-manuela-psi", "map-bernardo-psi"];
/** Os dois mapas da única psicopedagoga da unidade. */
const DE_LARISSA = ["map-laura-psp", "map-bernardo-psp"];

/**
 * Esconde o coletor de feedback antes de interagir.
 *
 * Ele é ferramenta de desenvolvimento e flutua no canto inferior direito —
 * onde o rodapé do painel de movimentação fica. No preview ele não existe
 * (`import.meta.env.DEV` no `main.tsx`), então esconder aqui não esconde nada
 * do produto.
 */
async function semColetor(page: Page): Promise<void> {
  await page.addStyleTag({ content: "[data-fbc-root] { display: none !important; }" });
}

async function selecionar(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) await page.locator(`[data-transfer-map="${id}"] input`).check();
}

async function escolherDestino(page: Page, nome: string): Promise<void> {
  await page.locator("#transfers-destino-trigger").click();
  await page.getByRole("option", { name: new RegExp(nome) }).click();
}

/** O veredito de cada linha da simulação, na ordem em que ela os mostra. */
async function veredito(page: Page) {
  return page.locator("[data-transfer-evaluation]").evaluateAll((linhas) =>
    linhas.map((linha) => ({
      id: linha.getAttribute("data-transfer-evaluation"),
      fit: linha.getAttribute("data-transfer-fit"),
      texto: linha.textContent ?? "",
    })),
  );
}

/**
 * O achado da área, na tela.
 *
 * Três mapas às 8h de terça, um destino livre: o primeiro cabe e os outros dois
 * passam a disputar **com ele**, não com um paciente de quem recebe. Avaliados
 * um a um, os três diriam "cabe".
 */
test("a seleção disputa consigo mesma, e a simulação diz isso", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, DE_JULIANA);

  await page.getByRole("button", { name: "Sugerir" }).click();
  await expect(page.locator("#transfers-destino-trigger")).toContainText("Marina Costa");

  await page.locator("#transfers-simular").click();
  const linhas = await veredito(page);

  expect(linhas.map((linha) => linha.fit)).toEqual(["ok", "warn", "warn"]);
  expect(linhas[1]?.texto).toContain("disputado com 1 mapa desta seleção");
  expect(linhas[0]?.texto).toContain("Cabe");
  expect(linhas[1]?.texto).toContain("Não cabe junto");
});

/**
 * A outra recusa, que pede outra ação.
 *
 * Helena só atende à tarde. Nenhum outro destino da mesma especialidade
 * resolveria isso — quem resolve é quem monta a agenda padrão dela —, e por
 * isso a palavra é outra.
 */
test("fora da escala do destino, a recusa tem outra palavra", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, DE_JULIANA);

  await escolherDestino(page, "Helena Martins Costa");
  await page.locator("#transfers-simular").click();

  const linhas = await veredito(page);
  expect(linhas.map((linha) => linha.fit)).toEqual(["bad", "bad", "bad"]);
  for (const linha of linhas) {
    expect(linha.texto).toContain("Não cabe");
    expect(linha.texto).toContain("fora da escala de Helena");
  }

  // E aplicar fica indisponível — visível, alcançável, com o motivo no foco.
  await expect(page.locator("#transfers-aplicar")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("#transfers-aplicar-motivo")).toContainText(
    "Nenhum mapa desta seleção cabe no destino escolhido",
  );
});

/**
 * A transferência é parcial, e a fila é a lista do que falta.
 *
 * O que não coube continua marcado. Sem isso, a coordenação teria de desmarcar
 * à mão o resto para tentar o destino seguinte — que é onde um mapa é
 * esquecido, porque o que sobra não está em lista nenhuma.
 */
test("a rodada leva o que cabe e devolve o resto à fila", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, DE_JULIANA);

  await escolherDestino(page, "Marina Costa");
  await page.locator("#transfers-simular").click();
  await expect(page.locator("#transfers-aplicar")).toContainText("Transferir 1 e manter 2 na fila");
  await page.locator("#transfers-aplicar").click();

  const painel = page.locator("aside");
  await expect(painel).toContainText("Na fila: 2 de 3 mapas");
  await expect(painel).toContainText("1 transferido · rodada 2");
  await expect(painel).toContainText("Marina Costa");

  // O que coube saiu da fila; o que não coube continua marcado.
  await expect(page.locator('[data-transfer-map="map-bernardo-psi"] input')).not.toBeChecked();
  await expect(page.locator('[data-transfer-map="map-sofia-psi"] input')).toBeChecked();
  await expect(page.locator('[data-transfer-map="map-manuela-psi"] input')).toBeChecked();

  // E o mapa transferido deixou de ser um mapa sem profissional.
  await expect(page.locator('[data-transfer-map="map-bernardo-psi"]')).toContainText(
    "Marina Costa",
  );
  await expect(page.locator("#conteudo")).not.toContainText("mapas sem profissional · Vila Aurora");
});

test("a central apresenta somente a lista, com o título dentro do card", async ({ page }) => {
  await page.goto(TELA);
  await expect(page.locator('[data-transfer-view="list"]')).toBeVisible();
  await expect(page.locator('input[value="agenda"]')).toHaveCount(0);
  // Pelo id, e não subindo um nível a partir da lista: a lista mora dentro da
  // própria moldura dela, e o salto posicional quebrava a cada vez que a
  // estrutura interna do card mudava. O que o teste quer saber é outra coisa —
  // que o título e a lista estão no mesmo card, e que o card tem recuo.
  const card = page.locator("#transfers-card");
  await expect(card.locator('[data-transfer-view="list"]')).toBeVisible();
  await expect(card.locator("header")).toContainText("Central de transferências");
  expect(await card.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))).toBeGreaterThan(0);
});

/**
 * O único impedimento duro da área.
 *
 * Sair da especialidade é decisão clínica. A tela não a toma sozinha nem quando
 * não há alternativa — ela diz que não há, e continua pedindo o ato.
 */
test("a exceção de especialidade exige a marcação e um motivo escrito", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, DE_LARISSA);

  const painel = page.locator("aside");
  await expect(painel).toContainText("Nenhum outro profissional de Psicopedagogia disponível");
  await expect(page.locator("#transfers-simular")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("#transfers-simular-motivo")).toContainText(
    "Escolha o profissional de destino",
  );

  await page.getByText("Exceção: permitir profissional de outra especialidade").click();
  await escolherDestino(page, "Paulo Nunes Ferreira");

  // Marcada a exceção e escolhido o destino, o que falta é o motivo — e a tela
  // diz quantos caracteres faltam, em vez de recusar em silêncio.
  await page.locator("#transfers-motivo").fill("urgen");
  await expect(page.locator("#transfers-simular")).toHaveAttribute("aria-disabled", "true");
  await expect(painel).toContainText("Faltam 5 caracteres para o motivo valer");

  await page.locator("#transfers-motivo").fill("Licença médica da única psicopedagoga da unidade");
  await expect(page.locator("#transfers-simular")).not.toHaveAttribute("aria-disabled", "true");

  await page.locator("#transfers-simular").click();
  const linhas = await veredito(page);
  expect(linhas.map((linha) => linha.fit)).toEqual(["ok", "ok"]);
  for (const linha of linhas) expect(linha.texto).toContain("Exceção");
  await expect(painel.getByRole("button", { name: "Exceção (2)", exact: true })).toBeVisible();
});

test("o filtro da lista define a rodada e preserva as outras especialidades na fila", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, ["map-sofia-psi", "map-alice-fono"]);
  await expect(page.locator("#transfers-rodada-trigger")).toHaveCount(0);
  await expect(page.locator("aside")).toContainText("A seleção reúne especialidades diferentes");
  await page.locator("#transfers-especialidade-trigger").click();
  await page.getByRole("option", { name: "Psicologia", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Exceção: permitir profissional de outra especialidade" })).not.toBeChecked();
  await expect(page.locator("#transfers-motivo")).toHaveCount(0);
  await escolherDestino(page, "Marina Costa");
  await page.locator("#transfers-simular").click();
  await expect(page.locator("#transfers-aplicar")).toContainText("manter 1 na fila");
  await page.locator("#transfers-aplicar").click();
  await page.locator("#transfers-especialidade-trigger").click();
  await page.getByRole("option", { name: "Fonoaudiologia", exact: true }).click();
  await expect(page.locator('[data-transfer-map="map-alice-fono"] input')).toBeChecked();
  await page.getByRole("button", { name: "Pausar com 1 pendente" }).click();
  await expect(page.locator("aside")).toContainText("Movimentação pausada · 1 mapa pendente");
  await page.getByRole("button", { name: "Retomar 1 mapa pendente" }).click();
  await expect(page.locator("#transfers-destino-trigger")).toBeVisible();
});

test("priorizar recalcula a disputa antes de aplicar", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, DE_JULIANA);
  await escolherDestino(page, "Marina Costa");
  await page.locator("#transfers-simular").click();
  await page.getByRole("button", { name: "Priorizar Sofia Ribeiro Lopes", exact: true }).click();
  await expect(page.locator('[data-transfer-evaluation="map-sofia-psi"]')).toHaveAttribute("data-transfer-fit", "ok");
  await expect(page.locator('[data-transfer-evaluation="map-sofia-psi"]')).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Prioridade alterada" })).toHaveClass("sr-only");
  await expect(page.locator('[data-transfer-evaluation="map-bernardo-psi"]')).toHaveAttribute("data-transfer-fit", "warn");
  await expect(page.locator("aside")).toContainText("Atendimentos anteriores ou já realizados permanecem");
  await expect(page.locator("aside")).not.toContainText("Saldo de horas por sala");
  await page.locator("#transfers-aplicar").click();
  await expect(page.locator('[data-transfer-map="map-sofia-psi"] input')).not.toBeChecked();
});


test("no celular a revisão é alcançável e os checkboxes mantêm área de toque", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, DE_JULIANA);
  const checkbox = page.locator('[data-transfer-map="map-sofia-psi"] input');
  await expect(checkbox).toHaveCSS("width", "16px");
  const label = await checkbox.evaluate((input: HTMLInputElement) => {
    const box = input.labels![0]!.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  expect(label.width).toBeGreaterThanOrEqual(24);
  expect(label.height).toBeGreaterThanOrEqual(24);
  await page.getByRole("button", { name: "Revisar 3 mapas" }).click();
  await expect(page.getByRole("complementary", { name: "Revisão da transferência" })).toBeFocused();
  await expect(page.locator("#transfers-destino-trigger")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});


test("pílulas filtram a simulação sem alterar o que será aplicado", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await selecionar(page, DE_JULIANA);
  await escolherDestino(page, "Marina Costa");
  await page.locator("#transfers-simular").click();
  const filters = page.getByRole("group", { name: "Filtrar resultados da simulação" });
  await filters.getByRole("button", { name: "Não cabe junto (2)", exact: true }).click();
  await expect(page.locator("[data-transfer-evaluation]")).toHaveCount(2);
  await expect(page.locator("#transfers-aplicar")).toContainText("Transferir 1 e manter 2 na fila");
  await filters.getByRole("button", { name: "Não cabe (0)", exact: true }).click();
  await expect(page.locator("aside")).toContainText("Nenhum mapa com este status");
  await filters.getByRole("button", { name: "Não cabe junto (2)", exact: true }).click();
  await page.getByRole("button", { name: "Priorizar Sofia Ribeiro Lopes", exact: true }).click();
  await expect(filters.getByRole("button", { name: "Todos (3)", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-transfer-evaluation="map-sofia-psi"]')).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Prioridade alterada" })).toHaveClass("sr-only");
  await expect(page.locator('[data-transfer-evaluation="map-sofia-psi"]')).toHaveAttribute("data-transfer-fit", "ok");
});
