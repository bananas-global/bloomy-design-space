import type { AutoCheckinData, CheckinArrival } from "../contracts/index.js";
import type { Fixture } from "@brucesantos/design-space";

/**
 * Fixtures do auto check-in do totem.
 *
 * Quatro chegadas na noite de 30/07. As de 21h em diante caem na janela em que
 * a função usada pela tela já procura o dia seguinte.
 *
 * Nomes sintéticos.
 */

function chegada(overrides: Partial<CheckinArrival> & { id: string }): CheckinArrival {
  return {
    guardianName: "Renata Alencar",
    patientName: "Helena M.",
    arrivedAt: "2026-07-30T18:20:00.000-03:00",
    scheduleDate: "2026-07-30",
    scheduleTime: "18:30",
    ...overrides,
  };
}

const chegadas: CheckinArrival[] = [
  // Fora da janela: o totem encontra e libera.
  chegada({ id: "c1" }),
  // Dentro da janela: consulta de hoje, e o totem diz que não há.
  chegada({
    id: "c2",
    guardianName: "Tiago Barreto",
    patientName: "Otávio L.",
    arrivedAt: "2026-07-30T21:15:00.000-03:00",
    scheduleTime: "21:30",
  }),
  chegada({
    id: "c3",
    guardianName: "Cláudia Ferrez",
    patientName: "Bruna S.",
    arrivedAt: "2026-07-30T22:10:00.000-03:00",
    scheduleTime: "22:15",
  }),
  // O lado oposto da janela: atendimento amanhã, liberado hoje.
  chegada({
    id: "c5",
    guardianName: "Sônia Vasques",
    patientName: "Nina C.",
    arrivedAt: "2026-07-30T22:40:00.000-03:00",
    scheduleDate: "2026-07-31",
    scheduleTime: "08:00",
  }),
  // Recusa correta: a consulta é de outro dia mesmo.
  chegada({
    id: "c4",
    guardianName: "Marcos Itaparica",
    patientName: "Ivo P.",
    arrivedAt: "2026-07-30T19:00:00.000-03:00",
    scheduleDate: "2026-08-04",
    scheduleTime: "09:00",
  }),
];

export const autoCheckinFixtures: Fixture[] = [
  {
    id: "auto-checkin-evening",
    label: "Duas famílias de pé na recepção, com consulta marcada",
    description:
      "As que chegam depois das 21h recebem do totem a informação de que os filhos não têm consulta hoje. A função correta, no mesmo fluxo, encontraria as duas.",
    data: { arrivals: chegadas } satisfies AutoCheckinData,
  },
  {
    id: "auto-checkin-daytime",
    label: "As mesmas chegadas, durante o dia",
    description:
      "Só a recusa correta permanece. É assim que o totem se comporta na maior parte do horário de funcionamento.",
    data: {
      arrivals: chegadas.map((c) => ({
        ...c,
        arrivedAt: "2026-07-30T18:20:00.000-03:00",
      })),
    } satisfies AutoCheckinData,
  },
];
