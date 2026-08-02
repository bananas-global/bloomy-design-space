import type { Fixture } from "@brucesantos/design-space";
import type { BatchAttempt, TissBatchData } from "../contracts/index.js";

/**
 * Fixtures do envio do lote TISS.
 *
 * Quatro tentativas de uma competência: uma enviada, uma recusada pela
 * operadora, uma que estourou no código, e uma ainda na fila. As duas do meio
 * gravaram a mesma string — é essa coincidência que a tela precisa desfazer.
 */

function attempt(overrides: Partial<BatchAttempt> & { id: string }): BatchAttempt {
  return {
    invoiceCode: "FAT-2026-07-001",
    insurerName: "Unimed Regional",
    authorizationCount: 18,
    amountCents: 1_240_000,
    attemptedAt: "2026-07-30T11:20:00.000-03:00",
    outcome: "sent",
    ...overrides,
  };
}

export const tissBatchFixtures: Fixture[] = [
  {
    id: "tiss-batch-mixed",
    label: "Quatro tentativas, duas indistinguíveis no registro",
    description:
      "Uma enviada, uma recusada, uma que estourou e uma na fila. A recusa e a exceção gravaram “Erro ao gerar o xml”, as duas.",
    data: {
      attempts: [
        attempt({ id: "t1" }),
        attempt({
          id: "t2",
          invoiceCode: "FAT-2026-07-002",
          insurerName: "Bradesco Saúde",
          authorizationCount: 11,
          amountCents: 780_000,
          outcome: "refused",
          insurerMessage: "Beneficiário sem elegibilidade na data do atendimento (código 1301).",
          loggedMessage: "Erro ao gerar o xml",
        }),
        attempt({
          id: "t3",
          invoiceCode: "FAT-2026-07-003",
          insurerName: "SulAmérica",
          authorizationCount: 24,
          amountCents: 1_610_000,
          outcome: "crashed",
          loggedMessage: "Erro ao gerar o xml",
        }),
        attempt({
          id: "t4",
          invoiceCode: "FAT-2026-07-004",
          insurerName: "Amil",
          authorizationCount: 7,
          amountCents: 430_000,
          outcome: "pending",
        }),
      ],
    } satisfies TissBatchData,
  },
  {
    id: "tiss-batch-all-sent",
    label: "Todos enviados",
    description: "Nada perdido, nada a distinguir — o aviso precisa calar.",
    data: {
      attempts: [
        attempt({ id: "t1" }),
        attempt({ id: "t2", invoiceCode: "FAT-2026-07-002", insurerName: "Bradesco Saúde" }),
      ],
    } satisfies TissBatchData,
  },
];
