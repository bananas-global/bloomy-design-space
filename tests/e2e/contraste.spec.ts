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

/**
 * O contraste dos **botões** espelhados.
 *
 * `button/1` foi copiado com as cores do sistema, e o primário reprova como
 * texto: branco sobre o ciano de assinatura, 2,22:1. Por isso os pontos de uso
 * dele levam `espelho-do-sistema` — e por isso o número fica aqui.
 *
 * A decisão 0001 já tinha decidido o contrário para os **tokens**: `#58bada` é
 * cor de marca, não de ação, e existe `--color-action` para isso. O componente
 * é de 0015 e reintroduziu o original. Enquanto as duas decisões convivem, o
 * mínimo é a medida estar escrita: se alguém corrigir o `Button`, este teste
 * falha e as marcações de espelho saem junto.
 *
 * **O `outline` saiu desta conta, e é o mecanismo funcionando.** Ele media
 * 2,47:1 — `--color-blue` como texto sobre branco — e o único ponto de uso dele
 * nesta rota era o "Sugerir" da Central de Transferências. O botão passou para
 * `tint`, que é `blue-dark` sobre `blue-light` e mede 5,25:1: passa AA, não
 * reproduz par reprovado nenhum e por isso perdeu a marcação de espelho. É a
 * medida que este arquivo continua prendendo, agora do lado de cá da régua.
 */
test("o contraste dos botões espelhados está registrado", async ({ page }) => {
  await page.goto("/transfers?scenario=transfers.queue&chrome=0");
  await page.locator("#conteudo").waitFor();
  // O painel — e com ele o Sugerir — só existe com seleção.
  await page.locator('[data-transfer-map="map-sofia-psi"] input').check();
  await page.locator("#transfers-sugerir").waitFor();

  const medido = await page.evaluate(`(() => {
    const razao = ${RAZAO};
    const sugerir = document.querySelector("#transfers-sugerir");
    // O primário não está na tela até haver seleção: monta-se um fora do fluxo,
    // com as mesmas classes, para medir o par e não o estado.
    const primario = document.createElement("button");
    primario.className = "bg-[var(--color-brand-blue)] text-white";
    document.body.appendChild(primario);
    const dele = getComputedStyle(primario);
    const par = { fg: dele.color, bg: dele.backgroundColor };
    primario.remove();

    return {
      primario: razao(par.fg, par.bg),
      // O tint pinta o próprio fundo, então o par é lido no botão mesmo.
      tint: sugerir
        ? razao(getComputedStyle(sugerir).color, getComputedStyle(sugerir).backgroundColor)
        : null,
    };
  })()`);

  // AA pede 4,5:1 para texto normal, e os botões são 16px em negrito — abaixo
  // dos 18,66px que valeriam como texto grande. O primário reprova e por isso
  // segue marcado como espelho; o `tint` passa e por isso não segue.
  expect(medido, "Contraste dos botões espelhados").toEqual({
    primario: 2.22,
    tint: 5.25,
  });
});
