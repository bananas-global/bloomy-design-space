import type { Fixture } from "@brucesantos/design-space";
import type { DistributedSchedule, DistributionData } from "../contracts/index.js";

/**
 * Fixtures da distribuição de guias.
 *
 * Sete atendimentos num dia com saldo para cinco. Os dois da tarde ficam sem —
 * não por serem menos importantes, mas por serem mais tarde.
 */

function schedule(overrides: Partial<DistributedSchedule> & { id: string }): DistributedSchedule {
  return {
    patientName: "Théo Andrade Lins",
    serviceName: "Sessão de intervenção ABA",
    start: "2026-07-30T08:00:00.000-03:00",
    amountCents: 18_000,
    authorizationCode: "AUT-2026-4471",
    packageName: "Intervenção ABA — 20 sessões",
    ...overrides,
  };
}

export const distributionFixtures: Fixture[] = [
  {
    id: "distribution-short-of-balance",
    label: "Sete atendimentos, saldo para cinco",
    description:
      "Os dois últimos do dia ficam sem guia. A ordem do relógio decidiu, e a lista de quem ficou de fora é descartada pelo worker.",
    data: {
      date: "2026-07-30",
      packages: [{ name: "Intervenção ABA — 20 sessões", startingBalance: 5 }],
      schedules: [
        schedule({ id: "d1" }),
        schedule({
          id: "d2",
          start: "2026-07-30T09:00:00.000-03:00",
          patientName: "Helena Vasconcelos Prado",
        }),
        schedule({
          id: "d3",
          start: "2026-07-30T10:00:00.000-03:00",
          patientName: "Nina Corrêa Bastos",
        }),
        schedule({
          id: "d4",
          start: "2026-07-30T11:00:00.000-03:00",
          patientName: "Bento Queiroga Farias",
        }),
        schedule({
          id: "d5",
          start: "2026-07-30T14:00:00.000-03:00",
          patientName: "Alice Bandeira Nogueira",
        }),
        schedule({
          id: "d6",
          start: "2026-07-30T15:00:00.000-03:00",
          patientName: "Rafael Toledo Marinho",
          authorizationCode: undefined,
          packageName: undefined,
        }),
        schedule({
          id: "d7",
          start: "2026-07-30T16:30:00.000-03:00",
          patientName: "Théo Andrade Lins",
          authorizationCode: undefined,
          packageName: undefined,
        }),
      ],
    } satisfies DistributionData,
  },
  {
    id: "distribution-balance-enough",
    label: "Saldo suficiente para o dia",
    description: "Todos os atendimentos receberam guia — não houve corte, e falar em corte seria inventar.",
    data: {
      date: "2026-07-30",
      packages: [{ name: "Intervenção ABA — 20 sessões", startingBalance: 12 }],
      schedules: [
        schedule({ id: "d1" }),
        schedule({
          id: "d2",
          start: "2026-07-30T09:00:00.000-03:00",
          patientName: "Helena Vasconcelos Prado",
        }),
        schedule({
          id: "d3",
          start: "2026-07-30T15:00:00.000-03:00",
          patientName: "Nina Corrêa Bastos",
        }),
      ],
    } satisfies DistributionData,
  },
];
