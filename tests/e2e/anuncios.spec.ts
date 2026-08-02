import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { scenarios } from "../../src/app/catalog.js";

/**
 * Regiões vivas contra o que os cenários declaram.
 *
 * O axe não alcança nada disto: ele valida a marcação, não a coerência entre o
 * que a especificação promete anunciar e o que a tela de fato anuncia. As duas
 * direções falham de jeitos diferentes:
 *
 * - **Declarado e ausente** — a especificação promete um anúncio que ninguém
 *   implementou. Quem lê o cenário aprova algo que não existe.
 * - **Presente e não declarado** — a tela anuncia algo que a especificação não
 *   menciona. Pior quando a região já vem preenchida: uma `role="status"` com
 *   texto no primeiro quadro é lida na chegada, e quem usa leitor de tela ouve
 *   uma frase sobre uma ação que não praticou.
 */
// A varredura percorre **todos** os cenários, e o catálogo cresce a cada
// módulo portado. O prazo acompanha o catálogo: encurtar a varredura para
// caber em 30s seria medir menos para aprovar mais.
test.setTimeout(180_000);

test("o que a tela anuncia é o que o cenário declara", async ({ page }) => {
  const declaradoSemRegiao: string[] = [];
  const anunciaSemDeclarar: string[] = [];

  for (const scenario of scenarios) {
    await page.goto(pathFor(scenario, { chrome: false }));
    await page.waitForSelector("#conteudo", { state: "attached" });
    await page
      .locator("#conteudo")
      .getByRole("heading")
      .first()
      .waitFor({ timeout: 5000 })
      .catch(() => {});

    const regioes = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '#conteudo [role="status"],#conteudo [role="alert"],#conteudo [aria-live]',
        ),
      ].map((el) => ({
        papel: el.getAttribute("role") ?? el.getAttribute("aria-live") ?? "live",
        texto: (el as HTMLElement).innerText.trim(),
      })),
    );

    const declara = (scenario.a11y as { announces?: string[] }).announces ?? [];
    const comTexto = regioes.filter((regiao) => regiao.texto.length > 0);

    if (declara.length > 0 && regioes.length === 0) {
      declaradoSemRegiao.push(scenario.id);
    }

    if (declara.length === 0 && comTexto.length > 0) {
      anunciaSemDeclarar.push(
        `${scenario.id}: ${comTexto.map((r) => `${r.papel} "${r.texto.slice(0, 40)}"`).join(" | ")}`,
      );
    }
  }

  expect(declaradoSemRegiao, "cenário declara anúncio e a tela não tem região viva").toEqual([]);
  expect(anunciaSemDeclarar, "a tela anuncia e o cenário não declara").toEqual([]);
});
