import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { scenarios } from "../../src/app/catalog.js";

/**
 * Varredura de propriedades que valem para **todos** os cenários.
 *
 * Separada de `journey.spec.ts` porque a natureza é outra: lá cada teste
 * verifica uma situação; aqui um teste percorre as 186 e afirma algo que não
 * deveria variar entre elas.
 *
 * **A espera não é detalhe.** A primeira versão desta varredura media a página
 * antes de o React renderizar: `innerText` vinha vazio, nenhum título existia,
 * nenhum salto de nível era encontrado, e ela passava anunciando que estava
 * tudo certo. Uma varredura que mede o nada aprova tudo — e é pior que não
 * existir, porque produz confiança. Por isso o teste conta as páginas vazias e
 * falha se houver alguma.
 */
// A varredura percorre **todos** os cenários, e o catálogo cresce a cada
// módulo portado. O prazo acompanha o catálogo: encurtar a varredura para
// caber em 30s seria medir menos para aprovar mais.
test.setTimeout(180_000);

test("nenhum cenário renderiza vazio, salta nível de título ou vaza jargão", async ({
  page,
}) => {
  const vazios: string[] = [];
  const saltos: string[] = [];
  const jargao: string[] = [];

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
      const raiz = document.querySelector("#conteudo") as HTMLElement | null;
      const texto = raiz?.innerText ?? "";
      const niveis = [...(raiz?.querySelectorAll("h1,h2,h3,h4") ?? [])].map((h) =>
        Number(h.tagName[1]),
      );

      // Nome de módulo Elixir, função com aridade, identificador snake_case e
      // crase de markdown — quatro formas de jargão vazarem para a tela.
      const suspeitos = new Set<string>();
      if (texto.includes("`")) suspeitos.add("crase de markdown");
      for (const achado of texto.matchAll(/\b[A-Z][A-Za-z]+\.[a-z_]+\/\d\b|\b[a-z]+_[a-z_]+\b/g)) {
        suspeitos.add(achado[0]);
      }

      return { vazio: texto.trim().length === 0, niveis, suspeitos: [...suspeitos] };
    });

    if (medido.vazio) vazios.push(scenario.id);

    for (let i = 1; i < medido.niveis.length; i += 1) {
      const anterior = medido.niveis[i - 1]!;
      const atual = medido.niveis[i]!;
      if (atual - anterior > 1) saltos.push(`${scenario.id}: h${anterior} → h${atual}`);
    }

    if (medido.suspeitos.length > 0) {
      jargao.push(`${scenario.id}: ${medido.suspeitos.join(", ")}`);
    }
  }

  // Primeiro os vazios: sem esta asserção, as duas seguintes passam de graça.
  expect(vazios, "cenários que renderizaram sem conteúdo").toEqual([]);
  expect(saltos, "saltos de nível de título").toEqual([]);
  expect(jargao, "jargão de código no texto da tela").toEqual([]);
});
