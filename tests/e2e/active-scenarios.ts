import { scenarios as catalogScenarios } from "../../src/app/catalog.js";

/**
 * Referências `ported` são arquivo histórico, não trabalho validado.
 *
 * Nenhuma varredura de navegador deve alcançá-las. Um cenário entra na suíte
 * somente quando deixa de ser `ported` pelo fluxo normal de design.
 */
export const activeScenarios = catalogScenarios.filter(
  (scenario) => scenario.status !== "ported",
);

