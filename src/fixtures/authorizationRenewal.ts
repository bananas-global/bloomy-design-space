import type { Fixture } from "@brucesantos/design-space";
import type { AuthorizationRenewalData, AuthorizationWindow } from "../contracts/index.js";

/**
 * Fixtures da renovação da janela.
 *
 * Três janelas: uma com saldo, uma zerada, e uma sem renovação automática. A
 * do meio é o ponto — ela vai renovar e chegar em novembro tão vazia quanto
 * está hoje.
 */

const TODAY = "2026-07-30";

function window(overrides: Partial<AuthorizationWindow> & { id: string }): AuthorizationWindow {
  return {
    patientName: "Théo Andrade Lins",
    durationStart: "2026-05-01",
    durationEnd: "2026-08-31",
    autoRenew: true,
    remainingSessions: 12,
    ...overrides,
  };
}

export const authorizationRenewalFixtures: Fixture[] = [
  {
    id: "authorization-renewal-mixed",
    label: "Uma janela vai renovar vazia",
    description:
      "Três janelas na virada do mês. A da Helena tem saldo zero e vai ser estendida até novembro assim mesmo.",
    data: {
      today: TODAY,
      windows: [
        window({ id: "w1" }),
        window({
          id: "w2",
          patientName: "Helena Vasconcelos Prado",
          remainingSessions: 0,
        }),
        window({
          id: "w3",
          patientName: "Nina Corrêa Bastos",
          autoRenew: false,
          remainingSessions: 4,
        }),
        // Segunda janela do Théo, que já tem a w1 renovando: ligar aqui esbarra
        // no índice único.
        window({
          id: "w4",
          durationStart: "2026-09-01",
          durationEnd: "2026-12-31",
          autoRenew: false,
          remainingSessions: 8,
        }),
      ],
    } satisfies AuthorizationRenewalData,
  },
  {
    id: "authorization-renewal-all-with-balance",
    label: "Todas com saldo",
    description: "Nenhuma janela vai renovar vazia — o aviso precisa calar.",
    data: {
      today: TODAY,
      windows: [
        window({ id: "w1" }),
        window({ id: "w2", patientName: "Helena Vasconcelos Prado", remainingSessions: 6 }),
      ],
    } satisfies AuthorizationRenewalData,
  },
];
