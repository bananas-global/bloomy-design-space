import type { Fixture } from "@brucesantos/design-space";
import type { HourMap, HourMapData, HourMapSlot } from "../contracts/index.js";

/**
 * Fixtures do mapa de horas.
 *
 * A semana pretendida do Théo para o segundo semestre: doze horas divididas em
 * seis horários, com as duas famílias de conflito acontecendo ao mesmo tempo.
 *
 * Um horário perde as duas coisas de propósito — profissional e sala —, porque
 * é o caso em que um aviso único de "conflito" mais engana sobre a quem
 * entregar o problema.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";
const THEO = { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" };

function slot(overrides: Partial<HourMapSlot> & { id: string; weekday: number }): HourMapSlot {
  return {
    startAt: "14:00",
    endAt: "15:00",
    specialty: "Aplicador ABA",
    serviceName: "Terapia ABA — individual",
    sessionLocation: "in_clinic",
    scheduleType: "patient",
    professionalName: "Marina Okabe",
    roomName: "Sala 1",
    conflicts: [],
    ...overrides,
  };
}

const GRADE: HourMapSlot[] = [
  slot({ id: "s1", weekday: 1 }),
  slot({ id: "s2", weekday: 3 }),
  // Profissional sem agenda padrão na sexta: é cadastro faltando, não disputa.
  slot({
    id: "s3",
    weekday: 5,
    professionalName: undefined,
    conflicts: ["no_agenda"],
  }),
  // Sala ocupada: perde a sala, mantém a profissional.
  slot({
    id: "s4",
    weekday: 2,
    startAt: "10:00",
    endAt: "11:00",
    specialty: "Fonoaudiologia",
    serviceName: "Fonoaudiologia — individual",
    professionalName: "Rui Sampaio Neto",
    roomName: undefined,
    conflicts: ["room_occupied"],
  }),
  // Perde as duas: profissional de férias e sala bloqueada.
  slot({
    id: "s5",
    weekday: 4,
    startAt: "09:00",
    endAt: "10:00",
    specialty: "Psicologia",
    serviceName: "Psicologia — individual",
    professionalName: undefined,
    roomName: undefined,
    conflicts: ["professional_blocked", "room_blocked"],
  }),
  // Acompanhamento terapêutico na escola: outro tipo de agendamento.
  slot({
    id: "s6",
    weekday: 3,
    startAt: "08:00",
    endAt: "10:00",
    specialty: "Aplicador ABA",
    serviceName: "Acompanhamento terapêutico",
    sessionLocation: "school",
    scheduleType: "at",
    professionalName: "Otávio Ferrandini",
    roomName: undefined,
  }),
];

function hourMap(overrides: Partial<HourMap> = {}): HourMap {
  return {
    id: "mapa-2026-2",
    patient: THEO,
    unitName: "Pinheiros",
    status: "creating",
    durationStart: "2026-08-01",
    durationEnd: "2026-12-31",
    autoRenew: true,
    slots: GRADE,
    warnings: [],
    ...overrides,
  };
}

export const hourMapFixtures: Fixture<HourMapData>[] = [
  {
    id: "hour-map-with-conflicts",
    label: "Mapa desenhado, com conflitos",
    description:
      "Seis horários: três limpos, um sem profissional, um sem sala e um sem os dois. Aplicar é permitido assim mesmo.",
    data: { map: hourMap(), now: NOW },
  },
  {
    id: "hour-map-clean",
    label: "Mapa sem conflito",
    description: "A semana inteira com profissional e sala definidos. É o caso raro.",
    data: {
      map: hourMap({
        slots: GRADE.slice(0, 2).concat(
          slot({ id: "s6", weekday: 5, professionalName: "Marina Okabe", roomName: "Sala 2" }),
        ),
      }),
      now: NOW,
    },
  },
  {
    id: "hour-map-applied",
    label: "Mapa já aplicado",
    description:
      "Os agendamentos existem e alguns já viraram atendimento. Editar o desenho agora criaria divergência.",
    data: {
      map: hourMap({
        status: "applied",
        warnings: [
          "3 de 6 horários foram criados sem profissional definido.",
          "2 de 6 horários foram criados sem sala definida.",
        ],
      }),
      now: NOW,
    },
  },
  {
    id: "hour-map-expiring",
    label: "Vence em cinco dias, sem sucessor",
    description:
      "Mapa aplicado que termina em 04/08, com renovação automática desligada e nenhum mapa começando depois. É o que `hour_map_status=expiring` encontra.",
    data: {
      map: hourMap({ status: "applied", autoRenew: false, durationEnd: "2026-08-04" }),
      now: NOW,
      hasSuccessor: false,
    },
  },
  {
    id: "hour-map-expiring-with-successor",
    label: "Vence em cinco dias, e já há o próximo",
    description:
      "O mesmo vencimento, com um mapa começando depois. A semana continua, e a tela precisa dizer isso em vez de calar.",
    data: {
      map: hourMap({ status: "applied", autoRenew: false, durationEnd: "2026-08-04" }),
      now: NOW,
      hasSuccessor: true,
    },
  },
  {
    id: "hour-map-empty",
    label: "Mapa em branco",
    description: "Nenhum horário desenhado ainda. Não há o que aplicar.",
    data: { map: hourMap({ slots: [] }), now: NOW },
  },
];
