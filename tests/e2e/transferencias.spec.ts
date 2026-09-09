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
  await expect(page.locator("#conteudo")).toContainText("5 mapas sem profissional");
});

/**
 * O horário lotado não vira oito fatias de dois pixels.
 *
 * Oito mapas na mesma faixa passam do limite de três da grade e viram um bloco
 * que diz quantas sessões agrupa — e abre a lista, onde a seleção por
 * especialidade é o gesto real de quem movimenta uma inativação.
 */
test("o horário lotado vira um bloco que abre a lista das oito sessões", async ({ page }) => {
  await page.goto(TELA);
  await semColetor(page);
  await page.locator('label:has(input[value="agenda"])').click();

  const resumo = page.locator("[data-transfer-cluster]");
  await expect(resumo).toHaveCount(1);
  await expect(resumo).toContainText("8 sessões");
  // A etiqueta visível é a acionável — quantos estão sem profissional. A
  // contagem por especialidade não cabe na coluna de um dia em toda largura, e
  // por isso ela é afirmada onde sempre está inteira: o `title`.
  await expect(resumo).toContainText("5 sem prof.");
  await expect(resumo).toHaveAttribute(
    "title",
    "8 sessões em Ter 08:00–09:00 · 4 de Psicologia · 2 de Fonoaudiologia · 2 de Terapia ocupacional · 5 sem profissional",
  );

  await resumo.click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText("Ter · 08:00–09:00 · 8 sessões");
  await expect(dialogo.locator('input[type="checkbox"]')).toHaveCount(8);

  await dialogo.getByRole("button", { name: /4 Psicologia/ }).click();
  await dialogo.getByRole("button", { name: "Concluir" }).click();

  await expect(page.locator("#conteudo")).toContainText("4 selecionados");
  await expect(page.locator("aside")).toContainText("4 mapas selecionados");
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
  for (const linha of linhas) expect(linha.texto).toContain("exceção");
  await expect(painel).toContainText("Motivo registrado");
  await expect(painel).toContainText("Sala 6");
});
