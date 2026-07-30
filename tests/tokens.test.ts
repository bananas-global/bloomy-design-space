import { describe, expect, it } from "vitest";
import { assertContrastPairs, checkContrastPair } from "@brucesantos/design-space/testing";
import { contrastPairs, knownProductionFailures } from "../src/tokens/contrast.js";

/**
 * Validação de contraste na origem.
 *
 * Contraste é propriedade de par de cores, então verificar aqui resolve uma vez,
 * em vez de perseguir o mesmo problema em trinta telas. Falhar o build é o que
 * transforma "a gente arruma depois" em "não entra assim".
 */
describe("tokens do Bloomy", () => {
  it("todos os pares declarados atingem WCAG 2.2 AA", () => {
    assertContrastPairs(contrastPairs);
  });

  it("nenhum par passa por margem estreita demais para sobreviver a um ajuste", () => {
    // 4.5 exato é aprovado e frágil: qualquer clareada futura reprova. Este teste
    // não é sobre conformidade, é sobre folga — e é o tipo de coisa que só
    // aparece quando alguém mede.
    const tight = contrastPairs
      .map(checkContrastPair)
      .filter((result) => result.ratio !== undefined && result.ratio < result.required + 0.1);

    expect(tight.map((result) => `${result.pair.name} (${result.label})`)).toEqual([]);
  });
});

/**
 * Este bloco documenta divergências reais entre o Design Space e o produto em
 * produção. Ele afirma que os tokens do produto **falham** — se algum dia o
 * Bloomy corrigir a origem, o teste quebra e avisa que o registro em
 * `docs/decisions/0001` ficou obsoleto.
 *
 * É o inverso do teste normal, e é deliberado: um registro de divergência que
 * ninguém revalida vira folclore.
 */
describe("divergências registradas com o produto em produção", () => {
  for (const failure of knownProductionFailures) {
    it(`o produto ainda falha em: ${failure.name}`, () => {
      const result = checkContrastPair(failure);
      expect(result.ratio).toBeDefined();
      expect(result.ratio).toBeCloseTo(failure.measured, 1);
      expect(
        result.passes,
        `Se este par passou, o produto foi corrigido — atualize docs/decisions/0001.`,
      ).toBe(false);
    });
  }
});
