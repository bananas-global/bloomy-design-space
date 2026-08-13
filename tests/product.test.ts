import { describe, expect, it } from "vitest";
import {
  assertValidProduct,
  scenariosUnderTest,
  validateProduct,
} from "@brucesantos/design-space/testing";
import { productDefinition } from "../src/app/product.js";

/**
 * Piso de qualidade do repositório: roda em milissegundos, não precisa de
 * navegador e pega a classe de erro que mais custa tempo — cenário apontando
 * para fixture, persona, regra ou rota que não existe.
 */
describe("contrato de cenário", () => {
  it("não tem erro de referência nem de forma", () => {
    expect(() => assertValidProduct(productDefinition)).not.toThrow();
  });

  it("não acumula aviso silencioso", () => {
    const warnings = validateProduct(productDefinition).filter((i) => i.level === "warning");
    // Um repositório que convive com dez avisos deixa de ler o décimo primeiro.
    // Se este teste falhar, resolva ou registre a exceção — não aumente o número.
    expect(warnings.map((w) => `${w.where}: ${w.message}`)).toEqual([]);
  });

  it("declara acessibilidade em todo cenário", () => {
    for (const scenario of productDefinition.scenarios) {
      expect(scenario.a11y.keyboard, scenario.id).toBe("full");
      expect(scenario.a11y.contrast, scenario.id).toBe("AA");
    }
  });

  it("todo cenário tem critério de aceite verificável", () => {
    const without = productDefinition.scenarios
      .filter((scenario) => (scenario.expected?.length ?? 0) === 0)
      .map((scenario) => scenario.id);
    expect(without).toEqual([]);
  });

  it("mantém o baseline inteiro como referência portada, fora do trabalho ativo", () => {
    expect(productDefinition.scenarios).toHaveLength(274);
    expect(new Set(productDefinition.scenarios.map((scenario) => scenario.status))).toEqual(
      new Set(["ported"]),
    );
    expect(scenariosUnderTest(productDefinition)).toEqual([]);
  });

  it("expõe os 47 componentes portados no catálogo visual do motor", () => {
    const components = productDefinition.components ?? [];
    expect(components).toHaveLength(47);
    expect(new Set(components.map((component) => component.id)).size).toBe(components.length);
    expect(components.every((component) => component.id.startsWith("core."))).toBe(true);
    expect(components.every((component) => component.group === "Core components")).toBe(true);
    expect(components.every((component) => typeof component.preview === "function")).toBe(true);
    expect(components.every((component) => (component.fixtures?.length ?? 0) > 0)).toBe(true);
    expect(
      components.every((component) =>
        component.fixtures?.some((fixture) => fixture.id === component.defaultFixture),
      ),
    ).toBe(true);
    expect(productDefinition.routes.some((route) => route.path === "/componentes")).toBe(false);
  });

  it("cobre sucesso, vazio, permissão, regra e exceção nos três módulos", () => {
    const required = ["sucesso", "vazio", "permissão", "regra", "exceção"];
    const tags = new Set(productDefinition.scenarios.flatMap((s) => s.tags ?? []));
    for (const tag of required) {
      expect(tags.has(tag), `falta cenário com a etiqueta "${tag}"`).toBe(true);
    }
  });

  it("cada módulo tem pelo menos um cenário de exceção ou permissão", () => {
    for (const module of productDefinition.modules) {
      const scenarios = productDefinition.scenarios.filter(
        (s) => s.id.split(".")[0] === module.id,
      );
      const hasEdge = scenarios.some((s) =>
        (s.tags ?? []).some((tag) => tag === "exceção" || tag === "permissão"),
      );
      expect(hasEdge, `${module.name} só tem caminho felizmente`).toBe(true);
    }
  });

  it("nenhuma fixture depende do relógio", async () => {
    // Determinismo é critério de aceite do ambiente. Duas execuções iguais
    // precisam produzir o mesmo valor, e o código-fonte não pode consultar o
    // relógio. Comparar o conteúdo com a data de hoje gerava falso positivo
    // sempre que uma fixture fixa coincidia legitimamente com o calendário.
    for (const fixture of productDefinition.fixtures) {
      const first = JSON.stringify(
        typeof fixture.data === "function" ? fixture.data() : fixture.data,
      );
      const second = JSON.stringify(
        typeof fixture.data === "function" ? fixture.data() : fixture.data,
      );
      expect(second, fixture.id).toBe(first);
    }

    const { readdirSync, readFileSync } = await import("node:fs");
    const fixturesDir = new URL("../src/fixtures/", import.meta.url);
    const forbidden = /\bnew\s+Date\s*\(|\bDate\.now\s*\(|\bMath\.random\s*\(/;
    const offenders = readdirSync(fixturesDir, { recursive: true })
      .map(String)
      .filter((path) => path.endsWith(".ts"))
      .filter((path) => forbidden.test(readFileSync(new URL(path, fixturesDir), "utf8")));
    expect(offenders).toEqual([]);
  });
});

/**
 * Coerência das regras.
 *
 * Duas formas de decadência que nenhum teste pegava: uma regra cujo `source`
 * aponta para um arquivo que não existe mais, e uma regra que nenhum cenário
 * cita — documentação que ninguém lê, mantida por educação.
 */
describe("coerência das regras", () => {
  it("todo `source` de regra aponta para um arquivo deste repositório", async () => {
    const { existsSync } = await import("node:fs");
    const quebradas = (productDefinition.rules ?? [])
      .filter((rule) => rule.source && !existsSync(rule.source))
      .map((rule) => `${rule.id}: ${rule.source}`);
    expect(quebradas).toEqual([]);
  });

  it("toda regra é citada por pelo menos um cenário", () => {
    const citadas = new Set(productDefinition.scenarios.flatMap((s) => s.rules ?? []));
    const orfas = (productDefinition.rules ?? [])
      .filter((rule) => !citadas.has(rule.id))
      .map((rule) => rule.id);
    // Uma regra que nenhum cenário aponta não é verificável por jornada: ela
    // vira texto. Se aparecer aqui, escreva o cenário ou apague a regra.
    expect(orfas).toEqual([]);
  });
});
