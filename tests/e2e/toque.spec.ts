import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { scenarios } from "../../src/app/catalog.js";

/**
 * Alvo de toque e transbordo horizontal, a 375 px.
 *
 * Dois critérios AA da WCAG 2.2 que o axe não verifica: **2.5.8 Target Size
 * (Minimum)**, 24×24 px, e **1.4.10 Reflow**, sem rolagem horizontal em
 * 320 px de largura equivalente.
 *
 * **O alvo é o que a pessoa toca, não o elemento que responde ao clique.** A
 * primeira versão desta varredura acusou onze alvos de 1×1 no NPS: são os
 * rádios `sr-only` do padrão "rádio escondido dentro do label", em que o alvo
 * real é o label, de 47×49. Medir o elemento em vez do alvo produz onze falsos
 * positivos numa tela sozinha — e um relatório com onze ruídos não é lido.
 */
// A varredura percorre **todos** os cenários, e o catálogo cresce a cada
// módulo portado. O prazo acompanha o catálogo: encurtar a varredura para
// caber em 30s seria medir menos para aprovar mais.
test.setTimeout(180_000);

test("nenhum alvo abaixo de 24px e nenhuma rolagem horizontal a 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  const pequenos: string[] = [];
  const transborda: string[] = [];

  for (const scenario of scenarios) {
    await page.goto(pathFor(scenario, { chrome: false }));
    await page.waitForSelector("#conteudo", { state: "attached" });
    await page
      .locator("#conteudo")
      .getByRole("heading")
      .first()
      .waitFor({ timeout: 5000 })
      .catch(() => {});

    const medido = await page.evaluate(() => {
      const seletor =
        '#conteudo a[href],#conteudo button,#conteudo input,#conteudo select,#conteudo textarea';
      const curtos: string[] = [];

      for (const elemento of document.querySelectorAll(seletor)) {
        if ((elemento as HTMLElement).offsetParent === null) continue;

        // Controle visualmente escondido dentro de um label: o alvo é o label.
        const escondido = elemento.classList.contains("sr-only");
        const alvo = escondido ? (elemento.closest("label") ?? elemento) : elemento;

        const caixa = alvo.getBoundingClientRect();
        if (caixa.width < 24 || caixa.height < 24) {
          const rotulo = (alvo.textContent || (alvo as HTMLElement).id || "?").trim().slice(0, 20);
          curtos.push(`${rotulo} ${Math.round(caixa.width)}×${Math.round(caixa.height)}`);
        }
      }

      const raiz = document.documentElement;
      return { curtos, excesso: raiz.scrollWidth - raiz.clientWidth };
    });

    if (medido.curtos.length > 0) pequenos.push(`${scenario.id}: ${medido.curtos.join(", ")}`);
    if (medido.excesso > 0) transborda.push(`${scenario.id}: +${medido.excesso}px`);
  }

  expect(pequenos, "alvos abaixo de 24×24").toEqual([]);
  expect(transborda, "rolagem horizontal a 375px").toEqual([]);
});
