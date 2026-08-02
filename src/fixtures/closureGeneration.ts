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
    label: "Duas desativações, e só uma perde o mês",
    description:
      "Cinco profissionais com horas em julho. Uma saiu em 28/07 e é coberta pelo worker de desativação; o outro saiu em 1º/08 e julho fica sem. E uma geração falhou com o worker devolvendo sucesso.",
    data: {
      month: "2026-07",
      ranAt: "2026-08-01T03:01:00.000Z",
      candidates: [
        candidate({ id: "p1" }),
        candidate({ id: "p2", name: "Otávio Ferrandini", hoursInMonth: 96 }),
        // Saiu dentro de julho: o worker de desativação gera o fechamento de
        // julho para ela. Coberta.
        candidate({
          id: "p3",
          name: "Bruna Kishimoto",
          activeNow: false,
          deactivatedOn: "2026-07-28",
          hoursInMonth: 118,
        }),
        // Saiu no dia 1º de agosto — que é como se registra "trabalhou até o
        // fim de julho". O worker de desativação gera o fechamento de agosto,
        // vazio, e julho fica sem.
        candidate({
          id: "p4",
          name: "Renato Bezerra Alcântara",
          activeNow: false,
          deactivatedOn: "2026-08-01",
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
      "Todos ativos, nenhuma falha. O worker dispara às 00:01 locais, que é 03:01 UTC do mesmo dia.",
    data: {
      month: "2026-07",
      ranAt: "2026-08-01T03:01:00.000Z",
      candidates: [
        candidate({ id: "p1" }),
        candidate({ id: "p2", name: "Otávio Ferrandini", hoursInMonth: 96 }),
      ],
    } satisfies ClosureGenerationData,
  },
];
