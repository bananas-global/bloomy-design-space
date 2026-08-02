import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { scenarios } from "../../src/app/catalog.js";

/**
 * Cadeia longa sem espaços, injetada em cada elemento de texto.
 *
 * E-mail de responsável, nome de arquivo, identificador de guia, URL colada num
 * recado do chat — todos existem no produto real e nenhum tem onde quebrar.
 *
 * **A medição precisa ser no elemento, e não na página.** A primeira versão
 * media `scrollWidth` do documento e não achou nada: a página não rolava porque
 * algum contêiner acima cortava o texto. Ou seja, o pior caso possível — texto
 * ilegível, sem sinal nenhum — passava como sucesso. Medido no elemento, 400
 * caracteres produziam 2.782 px de texto dentro de um parágrafo de 726 px.
 */
// A varredura percorre **todos** os cenários, e o catálogo cresce a cada
// módulo portado. O prazo acompanha o catálogo: encurtar a varredura para
// caber em 30s seria medir menos para aprovar mais.
test.setTimeout(180_000);

test("cadeia longa sem espaços quebra dentro da caixa", async ({ page }) => {
  const estouram: string[] = [];

  for (const scenario of scenarios) {
    await page.goto(pathFor(scenario, { chrome: false }));
    await page.waitForSelector("#conteudo", { state: "attached" });
    await page
      .locator("#conteudo")
      .getByRole("heading")
      .first()
      .waitFor({ timeout: 5000 })
      .catch(() => {});

    const fora = await page.evaluate(() => {
      const token = "responsavel.maria.das.gracas.albuquerque@clinica-bloomy-unidade-pinheiros.example.test";
      const alvos = [
        ...document.querySelectorAll("#conteudo p, #conteudo h2, #conteudo h3, #conteudo dd, #conteudo td, #conteudo li"),
      ].filter(
        (el) =>
          (el as HTMLElement).offsetParent !== null &&
          (el as HTMLElement).innerText.trim().length > 0 &&
          el.children.length === 0,
      );

      const problemas: string[] = [];
      for (const elemento of alvos) {
        const original = elemento.textContent;
        elemento.textContent = token;
        // Um pixel de folga para o arredondamento do navegador.
        if (elemento.scrollWidth > elemento.clientWidth + 1) {
          problemas.push(`${elemento.tagName} ${elemento.scrollWidth}>${elemento.clientWidth}`);
        }
        elemento.textContent = original;
      }
      return [...new Set(problemas)];
    });

    if (fora.length > 0) estouram.push(`${scenario.id}: ${fora.slice(0, 3).join(", ")}`);
  }

  expect(estouram, "texto que sai da caixa e é cortado").toEqual([]);
});
