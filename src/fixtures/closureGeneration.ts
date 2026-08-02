import type { Fixture } from "@brucesantos/design-space";
import type { ClosureCandidate, ClosureGenerationData } from "../contracts/index.js";

/**
 * Fixtures da geração mensal.
 *
 * O worker roda à meia-noite UTC de 1º de agosto — 21h de 31 de julho em
 * Brasília. Julho ainda não acabou para quem está na clínica, e é isso que
 * torna o deslocamento mensurável.
 */

function candidate(overrides: Partial<ClosureCandidate> & { id: string }): ClosureCandidate {
  return {
    name: "Marina Okabe",
    activeNow: true,
    hasClinicalHours: true,
    hoursInMonth: 132,
    ...overrides,
  };
}

export const closureGenerationFixtures: Fixture[] = [
  {
    id: "closure-generation-with-losses",
    label: "Duas desativações e uma falha silenciosa",
    description:
      "Cinco profissionais com horas em julho. Dois foram desativados antes da virada; um teve a geração falhar e o worker devolveu sucesso.",
    data: {
      month: "2026-07",
      ranAt: "2026-08-01T00:00:00.000Z",
      candidates: [
        candidate({ id: "p1" }),
        candidate({ id: "p2", name: "Otávio Ferrandini", hoursInMonth: 96 }),
        candidate({
          id: "p3",
          name: "Bruna Kishimoto",
          activeNow: false,
          deactivatedOn: "2026-07-28",
          hoursInMonth: 118,
        }),
        candidate({
          id: "p4",
          name: "Renato Bezerra Alcântara",
          activeNow: false,
          deactivatedOn: "2026-07-31",
          hoursInMonth: 140,
        }),
        candidate({
          id: "p5",
          name: "Clara Vidigal",
          hoursInMonth: 88,
          generationFailed: true,
        }),
      ],
    } satisfies ClosureGenerationData,
  },
  {
    id: "closure-generation-clean",
    label: "Virada sem perda",
    description:
      "Todos ativos, nenhuma falha, e o worker rodou às 06h UTC — depois do deslocamento.",
    data: {
      month: "2026-07",
      ranAt: "2026-08-01T06:00:00.000Z",
      candidates: [
        candidate({ id: "p1" }),
        candidate({ id: "p2", name: "Otávio Ferrandini", hoursInMonth: 96 }),
      ],
    } satisfies ClosureGenerationData,
  },
];
