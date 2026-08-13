import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { activeScenarios as scenarios } from "./active-scenarios.js";

/**
 * `prefers-reduced-motion`.
 *
 * O Bloomy tem pouquíssimo movimento — três transições de cor e a pulsação do
 * esqueleto de carregamento. É justamente por ser pouco que honrar a
 * preferência custa quase nada, e por ser pouco que ninguém se lembra de fazer.
 *
 * O caso que importa é a pulsação: ela é **infinita**. Uma tela que demora a
 * carregar fica piscando indefinidamente para quem tem enxaqueca ou distúrbio
 * vestibular, e a pessoa não tem como parar.
 */
// A varredura percorre apenas o trabalho ativo. Referências `ported` não são
// casos de teste.
test.setTimeout(180_000);

test.describe("movimento", () => {
  test("com movimento reduzido, nada anima nem transiciona", async ({ browser }) => {
    const contexto = await browser.newContext({ reducedMotion: "reduce" });
    const page = await contexto.newPage();

    const animando: string[] = [];

    // Um recorte: só os cenários que têm movimento. Rodar os 186 aqui não
    // acrescenta — o bloco de CSS é global e não varia por tela.
    for (const scenario of scenarios.slice(0, 12)) {
      await page.goto(pathFor(scenario, { chrome: false }) + "&network=loading");
      await page.waitForSelector("#conteudo", { state: "attached" });

      const longos = await page.evaluate(() => {
        const fora: string[] = [];
        for (const elemento of document.querySelectorAll("#conteudo *")) {
          const estilo = getComputedStyle(elemento);
          const anima = parseFloat(estilo.animationDuration) || 0;
          const transiciona = parseFloat(estilo.transitionDuration) || 0;
          const repete = estilo.animationIterationCount;
          if (anima > 0.001 || transiciona > 0.001 || repete === "infinite") {
            fora.push(`${elemento.tagName} anim=${estilo.animationDuration} rep=${repete}`);
          }
        }
        return [...new Set(fora)];
      });

      if (longos.length > 0) animando.push(`${scenario.id}: ${longos.slice(0, 3).join(", ")}`);
    }

    await contexto.close();
    expect(animando, "movimento apesar da preferência por movimento reduzido").toEqual([]);
  });

  test("sem a preferência, o esqueleto de carregamento continua pulsando", async ({ page }) => {
    // O contraponto: a correção não pode ter apagado o movimento para todo
    // mundo. Sem esta asserção, remover o `animate-pulse` faria o teste acima
    // passar — e a varredura estaria medindo o nada de novo.
    await page.goto(pathFor(scenarios[0]!, { chrome: false }) + "&network=loading");
    await page.waitForSelector("#conteudo", { state: "attached" });

    const pulsa = await page.evaluate(() =>
      [...document.querySelectorAll("#conteudo *")].some(
        (el) => getComputedStyle(el).animationIterationCount === "infinite",
      ),
    );

    expect(pulsa, "o esqueleto de carregamento deveria pulsar sem a preferência").toBe(true);
  });
});
