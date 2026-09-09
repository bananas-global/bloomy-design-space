import { expect, test } from "@playwright/test";

/**
 * Comportamento da Gestão de Chamadas que não é responsividade.
 *
 * O que é sobre largura mora em `responsivo.spec.ts`; aqui fica o que a tela
 * faz com os dados que recebe, em qualquer tamanho de tela.
 */
const TELA = "/calls?scenario=calls.queue&chrome=0&panel=0";

type Pagina = import("@playwright/test").Page;

/**
 * Clica na chave da caixa como uma pessoa clica: no desenho, não no `input`.
 *
 * O `input` do `Switch` é `sr-only` e o retângulo colorido é irmão dele dentro
 * do `<label>` — clicar no `input` direto falha por elemento interceptado, e
 * `{ force: true }` passaria por cima justamente da checagem que garante que o
 * desenho é clicável. Clicar no `<label>` é o caminho de verdade.
 */
async function virarChave(page: Pagina, sala: string) {
  const id = await page.getByLabel(`${sala} online`).getAttribute("id");
  await page.locator(`label:has(#${id})`).click();
}

async function estadoDosCartoes(page: Pagina) {
  return page.locator("#conteudo ul.grid > li").evaluateAll((itens) =>
    itens.map((item) => ({
      sala: item.querySelector("p.font-bold")?.textContent ?? "",
      ligada: item.textContent?.includes("Online") ?? false,
    })),
  );
}

/**
 * Na aba Dispositivos, caixa ligada vem primeiro.
 *
 * A ordem que vinha era a do cadastro, e nela a caixa desligada caía no meio
 * das ligadas. Isso cobra nas duas leituras que a aba tem: quem procura onde a
 * chamada vai sair varre a lista inteira, e quem procura o que está quebrado
 * também. Offline no fim junta as duas — o rodapé passa a ser a lista de
 * caixas para consertar.
 */
test("os dispositivos ligados vêm antes dos desligados", async ({ page }) => {
  await page.goto(TELA);
  await page.locator('[data-button-tab="devices"]').click();

  const cartoes = await estadoDosCartoes(page);
  expect(cartoes.length, "o cenário tem caixa ligada e caixa desligada").toBeGreaterThan(1);
  expect(cartoes.some((cartao) => cartao.ligada), "pelo menos uma ligada").toBe(true);
  expect(cartoes.some((cartao) => !cartao.ligada), "e pelo menos uma desligada").toBe(true);

  const ligadas = cartoes.map((cartao) => cartao.ligada);
  expect(
    ligadas.indexOf(false),
    "nenhuma ligada aparece depois de uma desligada",
  ).toBe(ligadas.lastIndexOf(true) + 1);
});

/**
 * E a ordem é **estável**: dentro de cada grupo, a ordem do cadastro se mantém.
 *
 * Importa porque desligar uma caixa reordena a lista na hora. Sem estabilidade,
 * um clique numa chave embaralharia as outras — e a lista de caixas para
 * consertar mudaria de ordem sozinha entre dois olhares.
 */
test("desligar uma caixa manda só ela para o fim, sem embaralhar o resto", async ({ page }) => {
  await page.goto(TELA);
  await page.locator('[data-button-tab="devices"]').click();

  const antes = await estadoDosCartoes(page);
  const primeira = antes[0]!.sala;
  const seguintes = antes.slice(1).map((cartao) => cartao.sala);

  await virarChave(page, primeira);

  const depois = await estadoDosCartoes(page);
  expect(
    depois.map((cartao) => cartao.sala).filter((sala) => sala !== primeira),
    "as outras mantêm a ordem entre si",
  ).toEqual(seguintes.filter((sala) => sala !== primeira));

  const desligadas = depois.filter((cartao) => !cartao.ligada).map((cartao) => cartao.sala);
  expect(desligadas, "e a que foi desligada está no grupo do fim").toContain(primeira);

  const ligadas = depois.map((cartao) => cartao.ligada);
  expect(ligadas.indexOf(false), "com as ligadas ainda todas antes").toBe(
    ligadas.lastIndexOf(true) + 1,
  );
});
