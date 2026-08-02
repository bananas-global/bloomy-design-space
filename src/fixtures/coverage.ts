import type { Fixture } from "@brucesantos/design-space";
import type { PlanCoverage, PlanCoverageData } from "../contracts/index.js";

/**
 * Fixtures da cobertura de plano.
 *
 * As quatro combinações possíveis de datas, para que as duas que o filtro
 * ignora fiquem visíveis ao lado das duas que ele reconhece.
 */

const TODAY = "2026-07-30";

function plan(overrides: Partial<PlanCoverage> & { id: string }): PlanCoverage {
  return {
    patientName: "Théo Andrade Lins",
    healthCareName: "Unimed Regional",
    ...overrides,
  };
}

export const coverageFixtures: Fixture[] = [
  {
    id: "coverage-four-combinations",
    label: "As quatro combinações de vigência",
    description:
      "Sem datas, com as duas, e as duas metades. O filtro reconhece as duas primeiras e some com as outras.",
    data: {
      today: TODAY,
      plans: [
        plan({ id: "c1", startOfCoverage: "2026-01-01", endOfCoverage: "2026-12-31" }),
        plan({
          id: "c2",
          patientName: "Helena Vasconcelos Prado",
          healthCareName: "Bradesco Saúde",
        }),
        plan({
          id: "c3",
          patientName: "Nina Corrêa Bastos",
          healthCareName: "SulAmérica",
          startOfCoverage: "2026-03-01",
        }),
        plan({
          id: "c4",
          patientName: "Bento Queiroga Farias",
          healthCareName: "Amil",
          endOfCoverage: "2027-02-28",
        }),
        plan({
          id: "c5",
          patientName: "Alice Bandeira Nogueira",
          healthCareName: "Unimed Regional",
          startOfCoverage: "2024-01-01",
          endOfCoverage: "2025-12-31",
        }),
      ],
    } satisfies PlanCoverageData,
  },
  {
    id: "coverage-all-well-formed",
    label: "Todas as vigências completas",
    description: "Nada a corrigir: o aviso precisa saber calar quando não há problema.",
    data: {
      today: TODAY,
      plans: [
        plan({ id: "c1", startOfCoverage: "2026-01-01", endOfCoverage: "2026-12-31" }),
        plan({
          id: "c2",
          patientName: "Helena Vasconcelos Prado",
          startOfCoverage: "2026-02-01",
          endOfCoverage: "2027-01-31",
        }),
      ],
    } satisfies PlanCoverageData,
  },
];
