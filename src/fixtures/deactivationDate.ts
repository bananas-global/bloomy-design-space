import type { Fixture } from "@brucesantos/design-space";
import type { DeactivationAttempt, DeactivationDateData } from "../contracts/index.js";

/**
 * Fixtures da data de desativação.
 *
 * Todas as tentativas são do dia 30/07. As horas de envio são o assunto: as de
 * 21h em diante caem na janela em que UTC já virou o dia.
 *
 * `roleArrivesAsText` é `false` em todas porque é assim que o monólito se
 * comporta — o papel é átomo. O cenário que o põe em `true` existe para mostrar
 * o que a exceção faria se chegasse a valer.
 */

function tentativa(
  overrides: Partial<DeactivationAttempt> & { id: string },
): DeactivationAttempt {
  return {
    patientName: "Helena M.",
    actorName: "Renata Alencar",
    actorRole: "coordinator",
    roleArrivesAsText: false,
    chosenDate: "2026-07-30",
    submittedAt: "2026-07-30T14:20:00.000-03:00",
    ...overrides,
  };
}

const tentativas: DeactivationAttempt[] = [
  // Fora da janela: a data de hoje passa, como deve.
  tentativa({ id: "d1", patientName: "Helena M." }),
  // Dentro da janela: mesma data, recusada por ser "passada".
  tentativa({
    id: "d2",
    patientName: "Otávio L.",
    submittedAt: "2026-07-30T21:40:00.000-03:00",
  }),
  // Administrador, dentro da janela: a exceção existe no código e não vale.
  tentativa({
    id: "d3",
    patientName: "Bruna S.",
    actorName: "Marcos Itaparica",
    actorRole: "admin",
    submittedAt: "2026-07-30T22:05:00.000-03:00",
  }),
  // Recusa legítima: a data escolhida passou de verdade, em qualquer fuso.
  tentativa({
    id: "d4",
    patientName: "Ivo P.",
    chosenDate: "2026-07-24",
    submittedAt: "2026-07-30T10:00:00.000-03:00",
  }),
  // Data futura, dentro da janela: passa, porque nem UTC alcança.
  tentativa({
    id: "d5",
    patientName: "Nina C.",
    chosenDate: "2026-08-14",
    submittedAt: "2026-07-30T23:10:00.000-03:00",
  }),
];

export const deactivationDateFixtures: Fixture[] = [
  {
    id: "deactivation-date-evening-window",
    label: "Fim de expediente, e hoje virou ontem",
    description:
      "Cinco tentativas de desativar no dia 30/07. As enviadas depois das 21h são recusadas por “data passada”, inclusive a do administrador, cuja exceção está escrita e não vale.",
    data: { attempts: tentativas } satisfies DeactivationDateData,
  },
  {
    id: "deactivation-date-daytime",
    label: "Todas enviadas durante o dia",
    description:
      "Os mesmos casos, enviados às 14h. Só a recusa legítima permanece — é assim que o defeito passa despercebido em nove de cada dez dias de trabalho.",
    data: {
      attempts: tentativas.map((t) => ({
        ...t,
        submittedAt: "2026-07-30T14:20:00.000-03:00",
      })),
    } satisfies DeactivationDateData,
  },
  {
    id: "deactivation-date-exemption-alive",
    label: "Se a exceção do administrador valesse",
    description:
      "As mesmas tentativas da noite, com o papel chegando como texto. Serve para mostrar o que a linha escrita no sistema faria, e o quanto ela sozinha não resolveria.",
    data: {
      attempts: tentativas.map((t) => ({ ...t, roleArrivesAsText: true })),
    } satisfies DeactivationDateData,
  },
];
