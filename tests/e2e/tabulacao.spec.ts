import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { scenarios } from "../../src/app/catalog.js";

/**
 * Ordem de tabulação contra ordem visual, **dentro de cada coluna**.
 *
 * A primeira versão desta varredura comparava só as coordenadas verticais e
 * acusou três telas. Nenhuma tinha defeito: descer a coluna esquerda e subir
 * para o topo da direita é o comportamento esperado de um layout de duas
 * colunas, e é o que quem navega por teclado espera encontrar. O defeito era da
 * heurística.
 *
 * Ficou o que de fato importa: **dentro de uma mesma coluna, o foco desce.** Um
 * salto para cima ali significa que a ordem do DOM discorda da ordem lida, e
 * quem navega por teclado é levado de volta a algo que já passou.
 */
// A varredura percorre **todos** os cenários, e o catálogo cresce a cada
// módulo portado. O prazo acompanha o catálogo: encurtar a varredura para
// caber em 30s seria medir menos para aprovar mais.
test.setTimeout(180_000);

test("dentro de uma coluna, o foco nunca volta para cima", async ({ page }) => {
  const achados: string[] = [];

  for (const scenario of scenarios) {
    await page.goto(pathFor(scenario, { chrome: false }));
    await page.waitForSelector("#conteudo", { state: "attached" });
    await page
      .locator("#conteudo")
      .getByRole("heading")
      .first()
      .waitFor({ timeout: 5000 })
      .catch(() => {});

    const problemas = await page.evaluate(() => {
      const seletor =
        '#conteudo a[href],#conteudo button,#conteudo input,#conteudo select,#conteudo textarea';
      const pontos = [...document.querySelectorAll(seletor)]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => {
          const caixa = el.getBoundingClientRect();
          return {
            y: Math.round(caixa.top + window.scrollY),
            x: Math.round(caixa.left),
            rotulo: (el.textContent || el.id || "?").trim().slice(0, 22),
          };
        });

      const fora: string[] = [];
      for (let i = 1; i < pontos.length; i += 1) {
        const anterior = pontos[i - 1];
        const atual = pontos[i];
        if (!anterior || !atual) continue;
        const mesmaColuna = Math.abs(atual.x - anterior.x) < 120;
        if (mesmaColuna && atual.y < anterior.y - 120) {
          fora.push(`${anterior.rotulo} → ${atual.rotulo}`);
        }
      }
      return fora;
    });

    if (problemas.length > 0) achados.push(`${scenario.id}: ${problemas.join(" | ")}`);
  }

  expect(achados, "foco volta para cima dentro da mesma coluna").toEqual([]);
});
