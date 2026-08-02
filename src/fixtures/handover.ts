import type { Fixture } from "@brucesantos/design-space";
import type { Handover, HandoverData } from "../contracts/index.js";

/**
 * Fixtures de assumir o agendamento de outro profissional.
 *
 * Quatro trocas na manhã de 30/07. Em duas o responsável anterior já tinha
 * recebido aviso sobre aquele agendamento hoje — e nessas ele não é avisado de
 * novo, embora a troca aconteça.
 *
 * Nomes sintéticos.
 */

function troca(overrides: Partial<Handover> & { id: string }): Handover {
  return {
    patientName: "Helena M.",
    serviceName: "Terapia ocupacional",
    previousProfessional: "Renata Alencar",
    newProfessional: "Tiago Barreto",
    scheduleStart: "2026-07-30T10:00:00.000-03:00",
    alreadyNotifiedToday: false,
    ...overrides,
  };
}

const trocas: Handover[] = [
  troca({ id: "t1" }),
  troca({
    id: "t2",
    patientName: "Otávio L.",
    serviceName: "Fonoaudiologia",
    previousProfessional: "Cláudia Ferrez",
    newProfessional: "Marcos Itaparica",
    scheduleStart: "2026-07-30T09:30:00.000-03:00",
    alreadyNotifiedToday: true,
  }),
  troca({
    id: "t3",
    patientName: "Bruna S.",
    serviceName: "Psicologia ABA",
    previousProfessional: "Cláudia Ferrez",
    newProfessional: "Sônia Vasques",
    scheduleStart: "2026-07-30T09:15:00.000-03:00",
    alreadyNotifiedToday: true,
  }),
  troca({
    id: "t4",
    patientName: "Ivo P.",
    serviceName: "Psicomotricidade",
    previousProfessional: "Renata Alencar",
    newProfessional: "Tiago Barreto",
    scheduleStart: "2026-07-30T11:00:00.000-03:00",
  }),
];

export const handoverFixtures: Fixture[] = [
  {
    id: "handover-with-silence",
    label: "Quatro trocas, e em duas o anterior não fica sabendo",
    description:
      "Duas trocas caem no ramo que suprime o aviso. A troca acontece igual, a tela diz “Atendimento assumido”, e quem perdeu o atendimento não é avisado.",
    data: { handovers: trocas, } satisfies HandoverData,
  },
  {
    id: "handover-all-notified",
    label: "Todos os anteriores avisados",
    description:
      "Nenhuma troca cai no ramo do erro. O comportamento é o esperado, e é o que se vê na maior parte das vezes.",
    data: {
      handovers: trocas.map((t) => ({ ...t, alreadyNotifiedToday: false })),
    } satisfies HandoverData,
  },
];
