import type { Fixture } from "@brucesantos/design-space";
import type { AutoCheckoutData, OpenPresence } from "../contracts/index.js";

/**
 * Fixtures da saída automática.
 *
 * Três check-ins de hoje, que a rotina fecha sem estragar nada, e três antigos,
 * que ela transforma em presenças de dias. É a diferença entre os dois grupos
 * que a tela precisa mostrar — sozinha, cada linha parece plausível.
 */

const RUNS_AT = "2026-07-30T21:00:00.000-03:00";

function presence(overrides: Partial<OpenPresence> & { id: string }): OpenPresence {
  return {
    patientName: "Théo Andrade Lins",
    unitName: "Unidade Pinheiros",
    checkinAt: "2026-07-30T13:50:00.000-03:00",
    ...overrides,
  };
}

export const autoCheckoutFixtures: Fixture[] = [
  {
    id: "auto-checkout-with-old-records",
    label: "Três de hoje e três esquecidos",
    description:
      "A rotina fecha os seis com a hora de agora. Os três antigos passam a declarar presenças de dias.",
    data: {
      runsAt: RUNS_AT,
      records: [
        presence({ id: "r1" }),
        presence({
          id: "r2",
          patientName: "Helena Vasconcelos Prado",
          checkinAt: "2026-07-30T09:05:00.000-03:00",
        }),
        presence({
          id: "r3",
          patientName: "Nina Corrêa Bastos",
          checkinAt: "2026-07-30T16:20:00.000-03:00",
        }),

        presence({
          id: "r4",
          patientName: "Bento Queiroga Farias",
          checkinAt: "2026-07-24T14:00:00.000-03:00",
        }),
        presence({
          id: "r5",
          patientName: "Alice Bandeira Nogueira",
          checkinAt: "2026-06-11T08:30:00.000-03:00",
        }),
        presence({
          id: "r6",
          patientName: "Rafael Toledo Marinho",
          checkinAt: "2026-05-02T10:15:00.000-03:00",
        }),
      ],
    } satisfies AutoCheckoutData,
  },
  {
    id: "auto-checkout-only-today",
    label: "Só check-ins de hoje",
    description: "A rotina faz o que promete: fecha a lista sem inventar duração nenhuma.",
    data: {
      runsAt: RUNS_AT,
      records: [
        presence({ id: "r1" }),
        presence({
          id: "r2",
          patientName: "Helena Vasconcelos Prado",
          checkinAt: "2026-07-30T09:05:00.000-03:00",
        }),
      ],
    } satisfies AutoCheckoutData,
  },
  {
    id: "auto-checkout-already-closed",
    label: "Depois de a rotina rodar",
    description:
      "Os mesmos registros já fechados, com a assinatura do sistema — o que permite distinguir do que uma pessoa fechou.",
    data: {
      runsAt: RUNS_AT,
      records: [
        presence({
          id: "r1",
          checkoutAt: "2026-07-30T15:10:00.000-03:00",
          checkoutDoneBy: "Recepção — Bianca",
        }),
        presence({
          id: "r5",
          patientName: "Alice Bandeira Nogueira",
          checkinAt: "2026-06-11T08:30:00.000-03:00",
          checkoutAt: RUNS_AT,
          checkoutDoneBy: "system",
        }),
      ],
    } satisfies AutoCheckoutData,
  },
];
