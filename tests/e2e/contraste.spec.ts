import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { activeScenarios as scenarios } from "./active-scenarios.js";

/**
 * O contraste do que é espelho do sistema.
 *
 * A varredura de acessibilidade exclui os elementos marcados com
 * `espelho-do-sistema`, porque eles copiam o produto e o produto reprova neles.
 * Sem a exclusão, a mesma violação aparece nos 254 cenários e afoga qualquer
 * problema novo.
 *
 * **Excluir sem medir seria esconder.** Este arquivo é a contrapartida: ele
 * calcula o contraste real desses elementos e prende os números. Se o sistema
 * corrigir, o teste falha e a exclusão sai junto. Se alguém "melhorar" a cópia
 * sem que o sistema tenha mudado, o teste também falha — e aí deixou de ser
 * espelho.
 */

/** Contraste WCAG entre duas cores renderizadas, lidas do próprio navegador. */
const RAZAO = `(frente, fundo) => {
  const canal = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = (cor) => {
    const [r, g, b] = cor.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number);
    return 0.2126 * canal(r / 255) + 0.7152 * canal(g / 255) + 0.0722 * canal(b / 255);
  };
  const a = lum(frente);
  const b = lum(fundo);
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return Math.round(((claro + 0.05) / (escuro + 0.05)) * 100) / 100;
}`;

test("o contraste do espelho é o do sistema, e está registrado", async ({ page }) => {
  await page.goto(pathFor(scenarios[0]!));

  const medido = await page.evaluate(`(() => {
    const razao = ${RAZAO};
    const drawer = document.querySelector(".bloomy-drawer");
    // O link de verdade, e não o primeiro filho: os itens ainda não portados
    // usam branco com transparência, que o navegador devolve em \`oklab(...)\` e
    // o extrator de números lê como preto — foi assim que a primeira medição
    // saiu 9,44 em vez de 2,2.
    const link = drawer.querySelector("a");
    const rotuloUnidade = document.querySelector("p.espelho-do-sistema span");

    return {
      drawer: razao(getComputedStyle(link).color, getComputedStyle(drawer).backgroundColor),
      // O fundo é o do primeiro ancestral que **pinta** alguma coisa, e não o de
      // um elemento escolhido pelo nome. O cabeçalho passou a ser uma linha sem
      // fundo com a barra branca dentro — e apontar para \`header\` media contra
      // transparente, que devolve o contraste do que estiver atrás.
      unidade: razao(
        getComputedStyle(rotuloUnidade).color,
        (() => {
          let no = rotuloUnidade.parentElement;
          while (no) {
            const fundo = getComputedStyle(no).backgroundColor;
            if (fundo && fundo !== "rgba(0, 0, 0, 0)" && fundo !== "transparent") return fundo;
            no = no.parentElement;
          }
          return "rgb(255, 255, 255)";
        })(),
      ),
    };
  })()`);

  // Números do produto, medidos no navegador. AA pede 4,5:1 para texto normal e
  // 3:1 para texto grande; o drawer usa 18px em negrito, que não alcança o limiar
  // de "texto grande" (18,66px), então os 4,5:1 valem para ele também.
  expect(medido, "Contraste dos elementos espelhados").toEqual({
    drawer: 2.22,
    unidade: 2.81,
  });
});
