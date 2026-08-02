import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { scenarios } from "../../src/app/catalog.js";

/**
 * Texto a 200% da fonte padrão do navegador.
 *
 * Não é zoom de página — esse escala tudo, inclusive o layout, e px acompanha.
 * É a **preferência de fonte** que a pessoa configura no navegador, que escala
 * só o texto. Com a escala em pixel, ela era ignorada em 294 lugares: quem
 * aumenta a fonte para enxergar melhor não recebia mudança nenhuma.
 *
 * Duas coisas precisam valer ao dobrar a raiz:
 *
 * 1. **O texto dobra de fato.** Sem isto o resto do teste não significa nada —
 *    uma tela que ignora a preferência nunca transborda por causa dela.
 * 2. **Nada transborda na horizontal.** Texto maior pode empurrar layout para
 *    fora, e aí a pessoa que precisava de letra maior recebe rolagem lateral.
 */
// A varredura percorre **todos** os cenários, e o catálogo cresce a cada
// módulo portado. O prazo acompanha o catálogo: encurtar a varredura para
// caber em 30s seria medir menos para aprovar mais.
test.setTimeout(180_000);

test("com a fonte padrão dobrada, o texto dobra e nada transborda", async ({ page }) => {
  const naoEscalou: string[] = [];
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
      // **Todos** os elementos de texto, não uma amostra. Medir um só deixa uma
      // tela quase inteira em pixel passar despercebida — foi o que aconteceu
      // na primeira versão, e só a mutação revelou.
      const elementos = [
        ...document.querySelectorAll("#conteudo p, #conteudo h1, #conteudo h2, #conteudo h3, #conteudo button, #conteudo span, #conteudo dd, #conteudo dt, #conteudo li, #conteudo td, #conteudo th"),
      ].filter((el) => (el as HTMLElement).offsetParent !== null);

      const antes = elementos.map((el) => parseFloat(getComputedStyle(el).fontSize));

      document.documentElement.style.fontSize = "32px";
      const depois = elementos.map((el) => parseFloat(getComputedStyle(el).fontSize));
      const raiz = document.documentElement;
      const excesso = raiz.scrollWidth - raiz.clientWidth;
      document.documentElement.style.fontSize = "";

      const parados: string[] = [];
      for (let i = 0; i < elementos.length; i += 1) {
        const a = antes[i] ?? 0;
        const b = depois[i] ?? 0;
        // Tolerância de meio pixel: o arredondamento do rem não é exato.
        if (a > 0 && b < a * 2 - 0.5) {
          const rotulo = (elementos[i]!.textContent || elementos[i]!.tagName).trim().slice(0, 18);
          parados.push(`${rotulo} ${a}→${b}`);
        }
      }
      return { parados: [...new Set(parados)], excesso };
    });

    if (medido.parados.length > 0) {
      naoEscalou.push(`${scenario.id}: ${medido.parados.slice(0, 4).join(", ")}`);
    }
    if (medido.excesso > 0) transborda.push(`${scenario.id}: +${medido.excesso}px`);
  }

  // Primeiro esta: sem escala não há como transbordar, e o segundo `expect`
  // passaria de graça.
  expect(naoEscalou, "texto que ignora a fonte padrão do navegador").toEqual([]);
  expect(transborda, "rolagem horizontal com a fonte dobrada").toEqual([]);
});
